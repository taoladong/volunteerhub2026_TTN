using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Runtime.Versioning;
using System.Text;
using QRCoder;

namespace BaseCore.Services.VolunteerHub
{
    public class CertificateService : ICertificateService
    {
        private readonly MySqlDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IBadgeService _badgeService;

        public CertificateService(MySqlDbContext context, INotificationService notificationService, IBadgeService badgeService)
        {
            _context = context;
            _notificationService = notificationService;
            _badgeService = badgeService;
        }

        public async Task IssueCertificatesForEventAsync(int eventId)
        {
            var ev = await _context.Events.FindAsync(eventId);
            if (ev == null) return;

            // Get all attended registrations
            var attended = await _context.Registrations
                .Where(r => r.EventId == eventId && r.IsAttended)
                .ToListAsync();

            foreach (var reg in attended)
            {
                // Skip if already issued
                var already = await _context.Certificates
                    .AnyAsync(c => c.UserId == reg.UserId && c.EventId == eventId);
                if (already) continue;

                var code = $"CERT-{DateTime.UtcNow.Year}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
                var cert = new Certificate
                {
                    UserId = reg.UserId,
                    EventId = eventId,
                    CertificateCode = code,
                    IssuedAt = DateTime.UtcNow,
                    VolunteerHours = reg.VolunteerHours,
                    PdfUrl = ""
                };
                _context.Certificates.Add(cert);

                await _context.SaveChangesAsync();

                var profile = await _context.VolunteerProfiles.FirstOrDefaultAsync(p => p.UserId == reg.UserId);
                if (profile != null)
                {
                    profile.TotalVolunteerHours = await _context.Registrations
                        .Where(r => r.UserId == reg.UserId && r.IsAttended)
                        .SumAsync(r => (decimal?)r.VolunteerHours) ?? 0m;
                    await _context.SaveChangesAsync();
                }

                _context.CertificateJobs.Add(new CertificateJob
                {
                    CertificateId = cert.Id,
                    Status = "Pending",
                    CreatedAtUtc = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                // Notify volunteer
                await _notificationService.SendAsync(reg.UserId,
                    "Chứng chỉ được cấp",
                    $"Bạn đã nhận được chứng chỉ tình nguyện cho sự kiện '{ev.Title}'.",
                    "CertificateIssued", cert.Id);

                // Check & award badges
                await _badgeService.CheckAndAwardAsync(reg.UserId);
            }
        }

        public async Task<List<Certificate>> GetByUserAsync(int userId)
        {
            return await _context.Certificates
                .Include(c => c.Event).ThenInclude(e => e.Category)
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.IssuedAt)
                .ToListAsync();
        }

        public async Task<Certificate?> GetByCodeAsync(string code)
        {
            return await _context.Certificates
                .Include(c => c.User)
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.CertificateCode == code);
        }

        [SupportedOSPlatform("windows")]
        public byte[] BuildCertificatePdf(Certificate cert, string verifyUrl)
        {
            using var imageStream = BuildCertificateImage(cert, verifyUrl);
            var imageBytes = imageStream.ToArray();

            var stream = new MemoryStream();
            var writer = new StreamWriter(stream, Encoding.ASCII, leaveOpen: true) { NewLine = "\n" };
            var offsets = new List<long>();

            void Write(string value) => writer.Write(value);
            void Obj(int id, string body)
            {
                writer.Flush();
                offsets.Add(stream.Position);
                Write($"{id} 0 obj\n{body}\nendobj\n");
            }

            Write("%PDF-1.4\n");
            Obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
            Obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
            Obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /CertImage 4 0 R >> >> /Contents 5 0 R >>");

            writer.Flush();
            offsets.Add(stream.Position);
            Write($"4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1684 /Height 1190 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {imageBytes.Length} >>\nstream\n");
            writer.Flush();
            stream.Write(imageBytes, 0, imageBytes.Length);
            Write("\nendstream\nendobj\n");

            var content = "q\n842 0 0 595 0 0 cm\n/CertImage Do\nQ";
            var contentBytes = Encoding.ASCII.GetBytes(content);
            Obj(5, $"<< /Length {contentBytes.Length} >>\nstream\n{content}\nendstream");

            writer.Flush();
            var xrefPosition = stream.Position;
            Write($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
            foreach (var offset in offsets)
                Write($"{offset:0000000000} 00000 n \n");
            Write($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefPosition}\n%%EOF");
            writer.Flush();

            return stream.ToArray();
        }

        [SupportedOSPlatform("windows")]
        private static MemoryStream BuildCertificateImage(Certificate cert, string verifyUrl)
        {
            const int width = 1684;
            const int height = 1190;
            var volunteer = cert.User?.Name ?? cert.User?.UserName ?? $"User #{cert.UserId}";
            var ev = cert.Event?.Title ?? $"Event #{cert.EventId}";
            var issued = cert.IssuedAt.ToString("yyyy-MM-dd");
            var hours = $"{cert.VolunteerHours:0.##} giờ tình nguyện";

            using var bitmap = new Bitmap(width, height);
            using var graphics = Graphics.FromImage(bitmap);
            graphics.Clear(Color.White);
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            using var borderPen = new Pen(Color.FromArgb(20, 28, 45), 5);
            graphics.DrawRectangle(borderPen, 84, 84, width - 168, height - 168);

            using var titleFont = new Font("Arial", 58, FontStyle.Bold, GraphicsUnit.Pixel);
            using var subtitleFont = new Font("Arial", 34, FontStyle.Regular, GraphicsUnit.Pixel);
            using var labelFont = new Font("Arial", 28, FontStyle.Regular, GraphicsUnit.Pixel);
            using var nameFont = new Font("Arial", 56, FontStyle.Bold, GraphicsUnit.Pixel);
            using var eventFont = new Font("Arial", 42, FontStyle.Bold, GraphicsUnit.Pixel);
            using var smallFont = new Font("Arial", 25, FontStyle.Regular, GraphicsUnit.Pixel);
            using var tinyFont = new Font("Arial", 21, FontStyle.Regular, GraphicsUnit.Pixel);
            using var brandFont = new Font("Arial", 27, FontStyle.Bold, GraphicsUnit.Pixel);
            using var brush = new SolidBrush(Color.Black);

            DrawCentered(graphics, "VOLUNTEERHUB CERTIFICATE", titleFont, brush, 150, width);
            DrawCentered(graphics, "Chứng nhận đóng góp tình nguyện", subtitleFont, brush, 228, width);

            var left = 222;
            graphics.DrawString("Chứng nhận rằng", labelFont, brush, left, 362);
            graphics.DrawString(volunteer, nameFont, brush, left, 420);
            graphics.DrawString("đã hoàn thành hoạt động tình nguyện cho", labelFont, brush, left, 520);
            DrawWrapped(graphics, ev, eventFont, brush, new RectangleF(left, 578, 1240, 110));
            graphics.DrawString($"Ghi nhận đóng góp: {hours}", labelFont, brush, left, 690);
            graphics.DrawString($"Ngày cấp: {issued}", smallFont, brush, left, 766);
            graphics.DrawString($"Mã chứng chỉ: {cert.CertificateCode}", smallFont, brush, left, 810);
            graphics.DrawString($"Xác thực: {verifyUrl}", tinyFont, brush, left, 858);
            graphics.DrawString("VolunteerHub", brandFont, brush, 1220, 986);

            using var qrBitmap = BuildQrBitmap(verifyUrl, 230);
            using var qrBackgroundBrush = new SolidBrush(Color.White);
            using var qrBorderPen = new Pen(Color.FromArgb(20, 28, 45), 3);
            var qrBox = new Rectangle(1220, 720, 280, 320);
            graphics.FillRectangle(qrBackgroundBrush, qrBox);
            graphics.DrawRectangle(qrBorderPen, qrBox);
            graphics.DrawImage(qrBitmap, 1245, 745, 230, 230);
            DrawCenteredInRect(graphics, "Quét để xác thực", tinyFont, brush, new RectangleF(1220, 990, 280, 36));


            var output = new MemoryStream();
            bitmap.Save(output, ImageFormat.Jpeg);
            output.Position = 0;
            return output;
        }

        [SupportedOSPlatform("windows")]
        private static void DrawCentered(Graphics graphics, string text, Font font, Brush brush, float y, float pageWidth)
        {
            var size = graphics.MeasureString(text, font);
            graphics.DrawString(text, font, brush, (pageWidth - size.Width) / 2, y);
        }

        [SupportedOSPlatform("windows")]
        private static void DrawWrapped(Graphics graphics, string text, Font font, Brush brush, RectangleF bounds)
        {
            using var format = new StringFormat
            {
                Trimming = StringTrimming.EllipsisWord,
                FormatFlags = StringFormatFlags.LineLimit
            };
            graphics.DrawString(text, font, brush, bounds, format);
        }

        [SupportedOSPlatform("windows")]
        private static Bitmap BuildQrBitmap(string payload, int size)
        {
            using var generator = new QRCodeGenerator();
            using var data = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
            var qrCode = new PngByteQRCode(data);
            var bytes = qrCode.GetGraphic(12);
            using var stream = new MemoryStream(bytes);
            using var raw = new Bitmap(stream);
            return new Bitmap(raw, new Size(size, size));
        }

        [SupportedOSPlatform("windows")]
        private static void DrawCenteredInRect(Graphics graphics, string text, Font font, Brush brush, RectangleF bounds)
        {
            using var format = new StringFormat
            {
                Alignment = StringAlignment.Center,
                LineAlignment = StringAlignment.Center,
                Trimming = StringTrimming.EllipsisWord
            };
            graphics.DrawString(text, font, brush, bounds, format);
        }
    }
}
