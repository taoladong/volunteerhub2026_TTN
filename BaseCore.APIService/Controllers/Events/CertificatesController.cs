using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Repository;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class CertificatesController : ControllerBase
    {
        private readonly ICertificateService _certificateService;
        private readonly MySqlDbContext _context;

        public CertificatesController(ICertificateService certificateService, MySqlDbContext context)
        {
            _certificateService = certificateService;
            _context = context;
        }

        [HttpGet("api/certificates"), Authorize]
        public async Task<IActionResult> GetMyCertificates()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var certs = await _certificateService.GetByUserAsync(userId);
            return Ok(certs);
        }

        [HttpGet("api/certificates/{code}")]
        public async Task<IActionResult> VerifyCertificate(string code)
        {
            var cert = await _certificateService.GetByCodeAsync(code);
            if (cert == null) return NotFound(new { message = "Certificate not found" });

            return Ok(new
            {
                cert.CertificateCode,
                cert.IssuedAt,
                cert.VolunteerHours,
                volunteerName = cert.User?.Name ?? cert.User?.UserName,
                eventTitle = cert.Event?.Title,
                eventStartDate = cert.Event?.StartDate,
                eventEndDate = cert.Event?.EndDate,
                eventLocation = cert.Event?.Location
            });
        }

        [HttpGet("api/certificates/{code}/pdf")]
        public async Task<IActionResult> DownloadCertificatePdf(string code)
        {
            var cert = await _certificateService.GetByCodeAsync(code);
            if (cert == null) return NotFound(new { message = "Certificate not found" });

            var pdfPath = ResolveGeneratedPdfPath(cert.PdfUrl);
            if (pdfPath != null && System.IO.File.Exists(pdfPath))
            {
                return PhysicalFile(pdfPath, "application/pdf", $"VolunteerHub-{code}.pdf");
            }

            var verifyUrl = $"{Request.Scheme}://{Request.Host}/verify/{Uri.EscapeDataString(code)}";
            var pdf = _certificateService.BuildCertificatePdf(cert, verifyUrl);
            var generatedPath = SaveFallbackPdf(code, pdf);
            if (generatedPath != null)
            {
                cert.PdfUrl = $"/certificates/{Path.GetFileName(generatedPath)}";
                await _context.SaveChangesAsync();
            }
            return File(pdf, "application/pdf", $"VolunteerHub-{code}.pdf");
        }

        private static string? SaveFallbackPdf(string code, byte[] pdf)
        {
            var safeCode = Path.GetFileName(code);
            if (string.IsNullOrWhiteSpace(safeCode)) return null;

            var dir = Path.Combine(AppContext.BaseDirectory, "wwwroot", "certificates");
            Directory.CreateDirectory(dir);

            var path = Path.Combine(dir, $"{safeCode}.pdf");
            System.IO.File.WriteAllBytes(path, pdf);
            return path;
        }

        private static string? ResolveGeneratedPdfPath(string? pdfUrl)
        {
            const string prefix = "/certificates/";
            if (string.IsNullOrWhiteSpace(pdfUrl) || !pdfUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var fileName = Path.GetFileName(pdfUrl);
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return null;
            }

            return Path.Combine(AppContext.BaseDirectory, "wwwroot", "certificates", fileName);
        }
    }
}
