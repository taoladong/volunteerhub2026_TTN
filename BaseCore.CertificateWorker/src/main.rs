use anyhow::{anyhow, Context, Result};
use chrono::{NaiveDateTime, Utc};
use futures_util::io::{AsyncRead, AsyncWrite};
use futures_util::TryStreamExt;
use qrcode::{Color, QrCode};
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tiberius::{Client, Config, QueryItem, ToSql};
#[cfg(windows)]
use tokio::net::windows::named_pipe::{ClientOptions, PipeMode};
use tokio::net::TcpStream;
use tokio::process::Command;
use tokio::time::sleep;
use tokio_util::compat::TokioAsyncWriteCompatExt;
use tracing::{error, info};

trait AsyncReadWrite: AsyncRead + AsyncWrite + Unpin + Send {}
impl<T> AsyncReadWrite for T where T: AsyncRead + AsyncWrite + Unpin + Send {}

type DbClient = Client<Box<dyn AsyncReadWrite>>;

#[derive(Clone)]
struct WorkerConfig {
    database_url: String,
    output_dir: PathBuf,
    public_base_url: String,
    verify_base_url: String,
    poll_interval: Duration,
    max_attempts: i32,
}

struct CertificateJob {
    id: i32,
    certificate_id: i32,
}

struct CertificateData {
    id: i32,
    code: String,
    issued_at: NaiveDateTime,
    volunteer_hours: f64,
    volunteer_name: String,
    event_title: String,
}

struct SqlcmdConfig {
    server: String,
    database: String,
}

#[derive(Deserialize)]
struct SqlcmdJobRow {
    #[serde(rename = "Id")]
    id: i32,
    #[serde(rename = "CertificateId")]
    certificate_id: i32,
}

#[derive(Deserialize)]
struct SqlcmdCertificateRow {
    #[serde(rename = "Id")]
    id: i32,
    #[serde(rename = "CertificateCode")]
    code: String,
    #[serde(rename = "IssuedAt")]
    issued_at: String,
    #[serde(rename = "VolunteerHours")]
    volunteer_hours: f64,
    #[serde(rename = "VolunteerName")]
    volunteer_name: String,
    #[serde(rename = "EventTitle")]
    event_title: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    if env::args().any(|arg| arg == "--self-test") {
        run_self_test().await?;
        return Ok(());
    }

    let once = env::args().any(|arg| arg == "--once");
    let config = WorkerConfig::from_env()?;
    tokio::fs::create_dir_all(&config.output_dir).await?;
    info!("certificate worker started");

    if once {
        run_once(&config).await?;
        return Ok(());
    }

    loop {
        if let Err(err) = run_once(&config).await {
            error!(error = %err, "worker iteration failed");
        }

        sleep(config.poll_interval).await;
    }
}

async fn run_self_test() -> Result<()> {
    let local_env = read_dotenv();
    let output_dir = config_value(&local_env, "CERTIFICATE_OUTPUT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("target/self-test"));
    tokio::fs::create_dir_all(&output_dir).await?;

    let cert = CertificateData {
        id: 0,
        code: "CERT-RUST-SELFTEST".to_string(),
        issued_at: Utc::now().naive_utc(),
        volunteer_hours: 8.0,
        volunteer_name: "Rust Worker Self Test".to_string(),
        event_title: "VolunteerHub Certificate Worker Runtime Test".to_string(),
    };
    let verify_url = "http://localhost:5173/verify/CERT-RUST-SELFTEST";
    let pdf = build_certificate_pdf(&cert, verify_url)?;
    let output_path = output_dir.join("CERT-RUST-SELFTEST.pdf");
    write_pdf_atomically(&output_path, &pdf).await?;
    info!(path = %output_path.display(), "self-test PDF generated");
    println!("{}", output_path.display());
    Ok(())
}

impl WorkerConfig {
    fn from_env() -> Result<Self> {
        let local_env = read_dotenv();
        let database_url = config_value(&local_env, "DATABASE_URL")
            .context("DATABASE_URL is required for the certificate worker")?;
        let output_dir = config_value(&local_env, "CERTIFICATE_OUTPUT_DIR").unwrap_or_else(|| {
            "../BaseCore.APIService/bin/Debug/net8.0/wwwroot/certificates".to_string()
        });
        let public_base_url = config_value(&local_env, "CERTIFICATE_PUBLIC_BASE_URL")
            .unwrap_or_else(|| "/certificates".to_string());
        let verify_base_url = config_value(&local_env, "CERTIFICATE_VERIFY_BASE_URL")
            .unwrap_or_else(|| "http://localhost:5173/verify".to_string());
        let poll_seconds = config_value(&local_env, "WORKER_POLL_INTERVAL_SECONDS")
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(5);
        let max_attempts = config_value(&local_env, "WORKER_MAX_ATTEMPTS")
            .and_then(|value| value.parse::<i32>().ok())
            .unwrap_or(3);

        Ok(Self {
            database_url,
            output_dir: PathBuf::from(output_dir),
            public_base_url: public_base_url.trim_end_matches('/').to_string(),
            verify_base_url: verify_base_url.trim_end_matches('/').to_string(),
            poll_interval: Duration::from_secs(poll_seconds),
            max_attempts,
        })
    }
}

fn config_value(local_env: &HashMap<String, String>, key: &str) -> Option<String> {
    env::var(key)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| local_env.get(key).cloned())
}

fn read_dotenv() -> HashMap<String, String> {
    let mut values = HashMap::new();
    let Ok(content) = fs::read_to_string(".env") else {
        return values;
    };

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.is_empty() {
            continue;
        }

        values.insert(key.to_string(), unquote_env_value(value.trim()));
    }

    values
}

fn unquote_env_value(value: &str) -> String {
    if value.len() >= 2 {
        let first = value.as_bytes()[0] as char;
        let last = value.as_bytes()[value.len() - 1] as char;
        if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
            return value[1..value.len() - 1].to_string();
        }
    }

    value.to_string()
}

async fn run_once(config: &WorkerConfig) -> Result<()> {
    if let Some(sqlcmd_config) = SqlcmdConfig::from_database_url(&config.database_url) {
        return run_once_sqlcmd(config, &sqlcmd_config).await;
    }

    let mut client = connect(&config.database_url).await?;

    let Some(job) = claim_next_job(&mut client, config.max_attempts).await? else {
        return Ok(());
    };

    info!(
        job_id = job.id,
        certificate_id = job.certificate_id,
        "claimed certificate job"
    );

    match process_job(&mut client, config, &job).await {
        Ok(()) => {
            info!(job_id = job.id, "certificate job completed");
        }
        Err(err) => {
            error!(job_id = job.id, error = %err, "certificate job failed");
            mark_failed(&mut client, &job, config.max_attempts, &err.to_string()).await?;
        }
    }

    Ok(())
}

impl SqlcmdConfig {
    fn from_database_url(database_url: &str) -> Option<Self> {
        let value = database_url.strip_prefix("sqlcmd:")?;
        let mut server = "(localdb)\\MSSQLLocalDB".to_string();
        let mut database = "VolunteerHub".to_string();

        for part in value.split(';') {
            let Some((key, val)) = part.split_once('=') else {
                continue;
            };
            let normalized_key = key.trim().to_ascii_lowercase().replace(' ', "");
            match normalized_key.as_str() {
                "server" | "datasource" => server = val.trim().to_string(),
                "database" | "initialcatalog" => database = val.trim().to_string(),
                _ => {}
            }
        }

        Some(Self { server, database })
    }
}

async fn run_once_sqlcmd(config: &WorkerConfig, sqlcmd_config: &SqlcmdConfig) -> Result<()> {
    let Some(job) = claim_next_job_sqlcmd(sqlcmd_config, config.max_attempts).await? else {
        return Ok(());
    };

    info!(
        job_id = job.id,
        certificate_id = job.certificate_id,
        "claimed certificate job via sqlcmd"
    );

    match process_job_sqlcmd(sqlcmd_config, config, &job).await {
        Ok(()) => info!(job_id = job.id, "certificate job completed via sqlcmd"),
        Err(err) => {
            error!(job_id = job.id, error = %err, "certificate job failed via sqlcmd");
            mark_failed_sqlcmd(sqlcmd_config, &job, config.max_attempts, &err.to_string()).await?;
        }
    }

    Ok(())
}

async fn claim_next_job_sqlcmd(
    sqlcmd_config: &SqlcmdConfig,
    max_attempts: i32,
) -> Result<Option<CertificateJob>> {
    let sql = format!(
        r#"
SET NOCOUNT ON;
DECLARE @claimed TABLE (Id int, CertificateId int);
UPDATE CertificateJobs
SET Status = 'Processing',
    Attempts = Attempts + 1,
    StartedAtUtc = SYSUTCDATETIME(),
    ErrorMessage = ''
OUTPUT inserted.Id, inserted.CertificateId INTO @claimed
WHERE Id = (
    SELECT TOP (1) Id
    FROM CertificateJobs WITH (READPAST, UPDLOCK, ROWLOCK)
    WHERE (Status = 'Pending' OR Status = 'Failed')
      AND Attempts < {max_attempts}
    ORDER BY CreatedAtUtc ASC
);
SELECT Id, CertificateId FROM @claimed FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
"#
    );

    let output = run_sqlcmd(sqlcmd_config, &sql).await?;
    let Some(json) = extract_json_object(&output) else {
        return Ok(None);
    };
    let row: SqlcmdJobRow = serde_json::from_str(&json)?;

    Ok(Some(CertificateJob {
        id: row.id,
        certificate_id: row.certificate_id,
    }))
}

async fn process_job_sqlcmd(
    sqlcmd_config: &SqlcmdConfig,
    config: &WorkerConfig,
    job: &CertificateJob,
) -> Result<()> {
    let cert = load_certificate_sqlcmd(sqlcmd_config, job.certificate_id).await?;
    let verify_url = format!("{}/{}", config.verify_base_url, url_escape(&cert.code));
    let pdf = build_certificate_pdf(&cert, &verify_url)?;
    let file_name = format!("{}.pdf", safe_file_name(&cert.code));
    let output_path = config.output_dir.join(&file_name);
    write_pdf_atomically(&output_path, &pdf).await?;

    let public_url = format!("{}/{}", config.public_base_url, file_name);
    let sql = format!(
        r#"
SET NOCOUNT ON;
UPDATE Certificates
SET PdfUrl = N'{public_url}'
WHERE Id = {cert_id};
UPDATE CertificateJobs
SET Status = 'Completed',
    CompletedAtUtc = SYSUTCDATETIME(),
    ErrorMessage = ''
WHERE Id = {job_id};
"#,
        public_url = sql_string(&public_url),
        cert_id = cert.id,
        job_id = job.id
    );

    run_sqlcmd(sqlcmd_config, &sql).await?;
    Ok(())
}

async fn load_certificate_sqlcmd(
    sqlcmd_config: &SqlcmdConfig,
    certificate_id: i32,
) -> Result<CertificateData> {
    let sql = format!(
        r#"
SET NOCOUNT ON;
SELECT c.Id,
       c.CertificateCode,
       CONVERT(varchar(33), c.IssuedAt, 126) AS IssuedAt,
       CAST(c.VolunteerHours AS float) AS VolunteerHours,
       COALESCE(NULLIF(u.Name, ''), u.UserName, CONCAT('User #', u.Id)) AS VolunteerName,
       COALESCE(e.Title, CONCAT('Event #', e.Id)) AS EventTitle
FROM Certificates c
JOIN Users u ON u.Id = c.UserId
JOIN Events e ON e.Id = c.EventId
WHERE c.Id = {certificate_id}
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
"#
    );

    let output = run_sqlcmd(sqlcmd_config, &sql).await?;
    let json = extract_json_object(&output)
        .ok_or_else(|| anyhow!("certificate {} not found", certificate_id))?;
    let row: SqlcmdCertificateRow = serde_json::from_str(&json)?;
    let issued_at = NaiveDateTime::parse_from_str(&row.issued_at, "%Y-%m-%dT%H:%M:%S%.f")
        .unwrap_or_else(|_| Utc::now().naive_utc());

    Ok(CertificateData {
        id: row.id,
        code: row.code,
        issued_at,
        volunteer_hours: row.volunteer_hours,
        volunteer_name: row.volunteer_name,
        event_title: row.event_title,
    })
}

async fn mark_failed_sqlcmd(
    sqlcmd_config: &SqlcmdConfig,
    job: &CertificateJob,
    max_attempts: i32,
    error: &str,
) -> Result<()> {
    let message = sql_string(&truncate(error, 1000));
    let sql = format!(
        r#"
SET NOCOUNT ON;
DECLARE @attempts int = (SELECT Attempts FROM CertificateJobs WHERE Id = {job_id});
UPDATE CertificateJobs
SET Status = CASE WHEN @attempts >= {max_attempts} THEN 'Failed' ELSE 'Pending' END,
    ErrorMessage = N'{message}'
WHERE Id = {job_id};
"#,
        job_id = job.id,
        max_attempts = max_attempts,
        message = message
    );

    run_sqlcmd(sqlcmd_config, &sql).await?;
    Ok(())
}

async fn run_sqlcmd(config: &SqlcmdConfig, sql: &str) -> Result<String> {
    let output = Command::new("sqlcmd")
        .args([
            "-S",
            &config.server,
            "-d",
            &config.database,
            "-E",
            "-y",
            "0",
            "-Y",
            "0",
            "-Q",
            sql,
        ])
        .output()
        .await
        .context("failed to run sqlcmd")?;

    if !output.status.success() {
        return Err(anyhow!(
            "sqlcmd failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn extract_json_object(output: &str) -> Option<String> {
    let start = output.find('{')?;
    let end = output.rfind('}')?;
    Some(output[start..=end].replace(['\r', '\n'], ""))
}

fn sql_string(value: &str) -> String {
    value.replace('\'', "''")
}

async fn connect(database_url: &str) -> Result<DbClient> {
    let mut config = Config::from_ado_string(database_url)?;
    config.trust_cert();

    if let Some(pipe_name) = named_pipe_from_connection_string(database_url) {
        #[cfg(windows)]
        {
            let pipe = ClientOptions::new()
                .pipe_mode(PipeMode::Message)
                .open(&pipe_name)
                .with_context(|| format!("failed to open SQL Server named pipe {}", pipe_name))?;
            let stream: Box<dyn AsyncReadWrite> = Box::new(pipe.compat_write());
            return Client::connect(config, stream).await.map_err(Into::into);
        }

        #[cfg(not(windows))]
        {
            return Err(anyhow!(
                "named pipe SQL connections are only supported on Windows"
            ));
        }
    }

    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;
    let stream: Box<dyn AsyncReadWrite> = Box::new(tcp.compat_write());
    Client::connect(config, stream).await.map_err(Into::into)
}

fn named_pipe_from_connection_string(database_url: &str) -> Option<String> {
    database_url.split(';').find_map(|part| {
        let (key, value) = part.split_once('=')?;
        let normalized_key = key.trim().to_ascii_lowercase().replace(' ', "");
        if normalized_key != "server" && normalized_key != "datasource" {
            return None;
        }

        let server = value.trim();
        server
            .strip_prefix("np:")
            .or_else(|| server.strip_prefix("NP:"))
            .map(ToOwned::to_owned)
    })
}

async fn claim_next_job(
    client: &mut DbClient,
    max_attempts: i32,
) -> Result<Option<CertificateJob>> {
    let sql = r#"
UPDATE CertificateJobs
SET Status = 'Processing',
    Attempts = Attempts + 1,
    StartedAtUtc = SYSUTCDATETIME(),
    ErrorMessage = ''
OUTPUT inserted.Id, inserted.CertificateId
WHERE Id = (
    SELECT TOP (1) Id
    FROM CertificateJobs WITH (READPAST, UPDLOCK, ROWLOCK)
    WHERE (Status = 'Pending' OR Status = 'Failed')
      AND Attempts < @P1
    ORDER BY CreatedAtUtc ASC
);
"#;

    let mut stream = client.query(sql, &[&max_attempts]).await?;
    while let Some(item) = stream.try_next().await? {
        if let QueryItem::Row(row) = item {
            let id: i32 = row.get(0).ok_or_else(|| anyhow!("missing job id"))?;
            let certificate_id: i32 = row
                .get(1)
                .ok_or_else(|| anyhow!("missing certificate id"))?;
            return Ok(Some(CertificateJob { id, certificate_id }));
        }
    }

    Ok(None)
}

async fn process_job(
    client: &mut DbClient,
    config: &WorkerConfig,
    job: &CertificateJob,
) -> Result<()> {
    let cert = load_certificate(client, job.certificate_id).await?;
    let verify_url = format!("{}/{}", config.verify_base_url, url_escape(&cert.code));
    let pdf = build_certificate_pdf(&cert, &verify_url)?;
    let file_name = format!("{}.pdf", safe_file_name(&cert.code));
    let output_path = config.output_dir.join(&file_name);
    write_pdf_atomically(&output_path, &pdf).await?;

    let public_url = format!("{}/{}", config.public_base_url, file_name);
    let sql = r#"
UPDATE Certificates
SET PdfUrl = @P1
WHERE Id = @P2;

UPDATE CertificateJobs
SET Status = 'Completed',
    CompletedAtUtc = SYSUTCDATETIME(),
    ErrorMessage = ''
WHERE Id = @P3;
"#;

    client
        .execute(
            sql,
            &[
                &public_url as &dyn ToSql,
                &cert.id as &dyn ToSql,
                &job.id as &dyn ToSql,
            ],
        )
        .await?;
    Ok(())
}

async fn load_certificate(client: &mut DbClient, certificate_id: i32) -> Result<CertificateData> {
    let sql = r#"
SELECT c.Id,
       c.CertificateCode,
       c.IssuedAt,
       CAST(c.VolunteerHours AS float),
       COALESCE(NULLIF(u.Name, ''), u.UserName, CONCAT('User #', u.Id)),
       COALESCE(e.Title, CONCAT('Event #', e.Id))
FROM Certificates c
JOIN Users u ON u.Id = c.UserId
JOIN Events e ON e.Id = c.EventId
WHERE c.Id = @P1;
"#;

    let mut stream = client.query(sql, &[&certificate_id]).await?;
    while let Some(item) = stream.try_next().await? {
        if let QueryItem::Row(row) = item {
            return Ok(CertificateData {
                id: row
                    .get(0)
                    .ok_or_else(|| anyhow!("missing certificate id"))?,
                code: row.get::<&str, _>(1).unwrap_or("").to_string(),
                issued_at: row.get(2).ok_or_else(|| anyhow!("missing issue date"))?,
                volunteer_hours: row.get(3).unwrap_or(0.0),
                volunteer_name: row.get::<&str, _>(4).unwrap_or("").to_string(),
                event_title: row.get::<&str, _>(5).unwrap_or("").to_string(),
            });
        }
    }

    Err(anyhow!("certificate {} not found", certificate_id))
}

async fn mark_failed(
    client: &mut DbClient,
    job: &CertificateJob,
    max_attempts: i32,
    error: &str,
) -> Result<()> {
    let status = if current_attempts(client, job.id).await? >= max_attempts {
        "Failed"
    } else {
        "Pending"
    };
    let message = truncate(error, 1000);

    client
        .execute(
            "UPDATE CertificateJobs SET Status = @P1, ErrorMessage = @P2 WHERE Id = @P3",
            &[
                &status as &dyn ToSql,
                &message as &dyn ToSql,
                &job.id as &dyn ToSql,
            ],
        )
        .await?;
    Ok(())
}

async fn current_attempts(client: &mut DbClient, job_id: i32) -> Result<i32> {
    let mut stream = client
        .query(
            "SELECT Attempts FROM CertificateJobs WHERE Id = @P1",
            &[&job_id],
        )
        .await?;
    while let Some(item) = stream.try_next().await? {
        if let QueryItem::Row(row) = item {
            return Ok(row.get(0).unwrap_or(0));
        }
    }
    Ok(0)
}

async fn write_pdf_atomically(path: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let tmp = path.with_extension("pdf.tmp");
    tokio::fs::write(&tmp, bytes).await?;
    if tokio::fs::try_exists(path).await? {
        tokio::fs::remove_file(path).await?;
    }
    tokio::fs::rename(tmp, path).await?;
    Ok(())
}

fn build_certificate_pdf(cert: &CertificateData, verify_url: &str) -> Result<Vec<u8>> {
    let qr = QrCode::new(verify_url.as_bytes())?;
    let qr_width = qr.width();
    let qr_size = 128.0;
    let module = qr_size / qr_width as f32;
    let qr_x = 600.0;
    let qr_y = 130.0;

    let volunteer = pdf_text(&cert.volunteer_name);
    let event_title = pdf_text(&cert.event_title);
    let issued = cert.issued_at.format("%Y-%m-%d").to_string();
    let hours = format!("{:.2} volunteer hours", cert.volunteer_hours);
    let code = pdf_text(&cert.code);
    let verify = pdf_text(verify_url);

    let mut content = String::new();
    content.push_str("q\n1 1 1 rg 0 0 842 595 re f\nQ\n");
    content.push_str("q\n0.08 0.11 0.18 RG 2 w 42 42 758 511 re S\nQ\n");
    draw_centered_text(&mut content, "VOLUNTEERHUB CERTIFICATE", 28, 421.0, 500.0);
    draw_centered_text(
        &mut content,
        "Certificate of volunteer contribution",
        15,
        421.0,
        468.0,
    );
    draw_text(&mut content, "This certifies that", 14, 95.0, 395.0);
    draw_text(&mut content, &volunteer, 26, 95.0, 358.0);
    draw_text(
        &mut content,
        "has completed volunteer work for",
        14,
        95.0,
        323.0,
    );
    draw_text(&mut content, &event_title, 20, 95.0, 286.0);
    draw_text(
        &mut content,
        &format!("Contribution: {}", hours),
        14,
        95.0,
        235.0,
    );
    draw_text(
        &mut content,
        &format!("Issued: {}", issued),
        12,
        95.0,
        202.0,
    );
    draw_text(
        &mut content,
        &format!("Certificate code: {}", code),
        12,
        95.0,
        178.0,
    );
    draw_text(&mut content, &format!("Verify: {}", verify), 9, 95.0, 153.0);
    draw_text(&mut content, "VolunteerHub", 14, 610.0, 105.0);

    content.push_str("q\n1 1 1 rg 0.08 0.11 0.18 RG 1 w 585 110 160 180 re B\nQ\n");
    content.push_str("q\n0 0 0 rg\n");
    for y in 0..qr_width {
        for x in 0..qr_width {
            if qr[(x, y)] == Color::Dark {
                let px = qr_x + x as f32 * module;
                let py = qr_y + (qr_width - 1 - y) as f32 * module;
                content.push_str(&format!(
                    "{:.2} {:.2} {:.2} {:.2} re f\n",
                    px,
                    py,
                    module + 0.05,
                    module + 0.05
                ));
            }
        }
    }
    content.push_str("Q\n");
    draw_centered_text(&mut content, "Scan to verify", 9, 665.0, 118.0);

    Ok(write_pdf_document(content.as_bytes(), 842.0, 595.0))
}

fn draw_text(content: &mut String, text: &str, size: i32, x: f32, y: f32) {
    content.push_str(&format!(
        "BT /F1 {} Tf 0 0 0 rg {:.2} {:.2} Td ({}) Tj ET\n",
        size,
        x,
        y,
        escape_pdf_text(text)
    ));
}

fn draw_centered_text(content: &mut String, text: &str, size: i32, center_x: f32, y: f32) {
    let approx_width = text.chars().count() as f32 * size as f32 * 0.28;
    draw_text(content, text, size, center_x - approx_width, y);
}

fn write_pdf_document(content: &[u8], width: f32, height: f32) -> Vec<u8> {
    let mut pdf = Vec::new();
    let mut offsets = Vec::new();

    fn push_obj(pdf: &mut Vec<u8>, offsets: &mut Vec<usize>, id: i32, body: &[u8]) {
        offsets.push(pdf.len());
        pdf.extend_from_slice(format!("{} 0 obj\n", id).as_bytes());
        pdf.extend_from_slice(body);
        pdf.extend_from_slice(b"\nendobj\n");
    }

    pdf.extend_from_slice(b"%PDF-1.4\n");
    push_obj(
        &mut pdf,
        &mut offsets,
        1,
        b"<< /Type /Catalog /Pages 2 0 R >>",
    );
    push_obj(
        &mut pdf,
        &mut offsets,
        2,
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    );
    push_obj(
        &mut pdf,
        &mut offsets,
        3,
        format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {:.0} {:.0}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            width, height
        )
        .as_bytes(),
    );
    let stream_header = format!("<< /Length {} >>\nstream\n", content.len());
    let mut stream_obj = Vec::new();
    stream_obj.extend_from_slice(stream_header.as_bytes());
    stream_obj.extend_from_slice(content);
    stream_obj.extend_from_slice(b"\nendstream");
    push_obj(&mut pdf, &mut offsets, 4, &stream_obj);
    push_obj(
        &mut pdf,
        &mut offsets,
        5,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    );

    let xref_pos = pdf.len();
    pdf.extend_from_slice(
        format!("xref\n0 {}\n0000000000 65535 f \n", offsets.len() + 1).as_bytes(),
    );
    for offset in offsets {
        pdf.extend_from_slice(format!("{:010} 00000 n \n", offset).as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{}\n%%EOF",
            xref_pos
        )
        .as_bytes(),
    );

    pdf
}

fn pdf_text(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii() { ch } else { '?' })
        .collect::<String>()
}

fn escape_pdf_text(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('(', "\\(")
        .replace(')', "\\)")
}

fn safe_file_name(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn url_escape(value: &str) -> String {
    value.replace(' ', "%20")
}

fn truncate(value: &str, max_len: usize) -> String {
    if value.len() <= max_len {
        return value.to_string();
    }

    let mut end = max_len;
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    value[..end].to_string()
}
