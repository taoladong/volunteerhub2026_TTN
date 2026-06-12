using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using BaseCore.Entities;
using BaseCore.Services.VolunteerHub;

namespace AuthService.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminVerificationsController : ControllerBase
    {
        private readonly MySqlDbContext _context;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;

        public AdminVerificationsController(
            MySqlDbContext context,
            IAuditLogService auditLogService,
            INotificationService notificationService)
        {
            _context = context;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
        }

        // ================= Volunteer KYC Endpoints =================

        [HttpGet("api/admin/volunteer-kyc")]
        public async Task<IActionResult> GetVolunteerKycRequests([FromQuery] string? status = "PendingVerification")
        {
            var query = _context.VolunteerProfiles
                .Include(p => p.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(p => p.KycStatus == status);

            var items = await query
                .OrderByDescending(p => p.KycSubmittedAt ?? DateTime.MinValue)
                .Select(p => new
                {
                    p.Id,
                    p.UserId,
                    VolunteerName = p.User != null ? p.User.Name : "",
                    VolunteerEmail = p.User != null ? p.User.Email : "",
                    p.KycStatus,
                    p.IdentityFrontImageUrl,
                    p.IdentityBackImageUrl,
                    p.PortraitImageUrl,
                    p.KycSubmittedAt,
                    p.KycReviewedAt,
                    p.KycReviewedBy,
                    p.KycAdminNote
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPut("api/admin/volunteer-kyc/{profileId}/approve")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ApproveVolunteerKyc(int profileId, [FromBody] AdminReviewDto? dto = null)
        {
            var profile = await _context.VolunteerProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == profileId);
            if (profile == null) return NotFound();
            if (profile.KycStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể duyệt hồ sơ KYC đang chờ xác minh" });

            profile.KycStatus = "Verified";
            profile.KycReviewedAt = DateTime.UtcNow;
            profile.KycReviewedBy = GetCurrentUserId();
            profile.KycAdminNote = dto?.Note ?? "";

            await _context.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerKyc.Approve", "VolunteerProfile", profile.Id, dto?.Note);
            await _notificationService.SendAsync(
                profile.UserId,
                "KYC đã được xác minh",
                "Hồ sơ xác thực danh tính của bạn đã được duyệt. Bạn có thể đăng ký các sự kiện yêu cầu KYC.",
                "VolunteerKycApproved",
                profile.Id);
            return Ok(profile);
        }

        [HttpPut("api/admin/volunteer-kyc/{profileId}/reject")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RejectVolunteerKyc(int profileId, [FromBody] AdminReviewDto? dto = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.Note) || dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Vui lòng nhập lý do từ chối KYC tối thiểu 10 ký tự" });

            var profile = await _context.VolunteerProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == profileId);
            if (profile == null) return NotFound();
            if (profile.KycStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể từ chối hồ sơ KYC đang chờ xác minh" });

            profile.KycStatus = "Rejected";
            profile.KycReviewedAt = DateTime.UtcNow;
            profile.KycReviewedBy = GetCurrentUserId();
            profile.KycAdminNote = dto.Note.Trim();

            await _context.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerKyc.Reject", "VolunteerProfile", profile.Id, dto.Note);
            await _notificationService.SendAsync(
                profile.UserId,
                "KYC bị từ chối",
                $"Hồ sơ xác thực danh tính của bạn chưa đạt yêu cầu. Lý do: {dto.Note.Trim()}",
                "VolunteerKycRejected",
                profile.Id);
            return Ok(profile);
        }

        [HttpPut("api/admin/volunteer-kyc/{profileId}/request-changes")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RequestVolunteerKycChanges(int profileId, [FromBody] AdminReviewDto? dto = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.Note) || dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Vui lòng nhập nội dung cần bổ sung tối thiểu 10 ký tự" });

            var profile = await _context.VolunteerProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == profileId);
            if (profile == null) return NotFound();
            if (profile.KycStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể yêu cầu bổ sung với hồ sơ KYC đang chờ xác minh" });

            profile.KycStatus = "ChangesRequested";
            profile.KycReviewedAt = DateTime.UtcNow;
            profile.KycReviewedBy = GetCurrentUserId();
            profile.KycAdminNote = dto.Note.Trim();

            await _context.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerKyc.RequestChanges", "VolunteerProfile", profile.Id, dto.Note);
            await _notificationService.SendAsync(
                profile.UserId,
                "KYC cần bổ sung",
                $"Hồ sơ xác thực danh tính của bạn cần bổ sung thông tin. Nội dung: {dto.Note.Trim()}",
                "VolunteerKycChangesRequested",
                profile.Id);
            return Ok(profile);
        }

        // ================= Volunteer Skill Verifications Endpoints =================

        [HttpGet("api/admin/volunteer-skill-verifications")]
        public async Task<IActionResult> GetVolunteerSkillVerifications([FromQuery] string? status = "PendingVerification")
        {
            var query = _context.VolunteerSkills
                .Include(vs => vs.User)
                .Include(vs => vs.Skill)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(vs => vs.VerificationStatus == status);

            var items = await query
                .OrderByDescending(vs => vs.VerificationSubmittedAt ?? DateTime.MinValue)
                .Select(vs => new
                {
                    vs.Id,
                    vs.UserId,
                    VolunteerName = vs.User != null ? vs.User.Name : "",
                    VolunteerEmail = vs.User != null ? vs.User.Email : "",
                    SkillName = vs.Skill != null ? vs.Skill.Name : "",
                    SkillCategory = vs.Skill != null ? vs.Skill.Category : "",
                    vs.Level,
                    vs.VerificationStatus,
                    vs.EvidenceUrl,
                    vs.VerificationNote,
                    vs.VerificationSubmittedAt,
                    vs.VerificationReviewedAt,
                    vs.VerificationReviewedBy,
                    vs.AdminNote
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPut("api/admin/volunteer-skill-verifications/{id}/approve")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ApproveVolunteerSkill(int id, [FromBody] AdminReviewDto? dto = null)
        {
            var volunteerSkill = await _context.VolunteerSkills
                .Include(vs => vs.Skill)
                .FirstOrDefaultAsync(vs => vs.Id == id);
            if (volunteerSkill == null) return NotFound();
            if (volunteerSkill.VerificationStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể duyệt kỹ năng đang chờ xác minh" });

            volunteerSkill.VerificationStatus = "Verified";
            volunteerSkill.VerificationReviewedAt = DateTime.UtcNow;
            volunteerSkill.VerificationReviewedBy = GetCurrentUserId();
            volunteerSkill.AdminNote = dto?.Note ?? "";

            await _context.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerSkill.Approve", "VolunteerSkill", volunteerSkill.Id, dto?.Note);
            await _notificationService.SendAsync(
                volunteerSkill.UserId,
                "Kỹ năng đã được xác minh",
                $"Kỹ năng '{volunteerSkill.Skill?.Name ?? "của bạn"}' đã được admin xác minh.",
                "VolunteerSkillApproved",
                volunteerSkill.Id);
            return Ok(volunteerSkill);
        }

        [HttpPut("api/admin/volunteer-skill-verifications/{id}/reject")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RejectVolunteerSkill(int id, [FromBody] AdminReviewDto? dto = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.Note) || dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Vui lòng nhập lý do từ chối kỹ năng tối thiểu 10 ký tự" });

            var volunteerSkill = await _context.VolunteerSkills
                .Include(vs => vs.Skill)
                .FirstOrDefaultAsync(vs => vs.Id == id);
            if (volunteerSkill == null) return NotFound();
            if (volunteerSkill.VerificationStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể từ chối kỹ năng đang chờ xác minh" });

            volunteerSkill.VerificationStatus = "Rejected";
            volunteerSkill.VerificationReviewedAt = DateTime.UtcNow;
            volunteerSkill.VerificationReviewedBy = GetCurrentUserId();
            volunteerSkill.AdminNote = dto.Note.Trim();

            await _context.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerSkill.Reject", "VolunteerSkill", volunteerSkill.Id, dto.Note);
            await _notificationService.SendAsync(
                volunteerSkill.UserId,
                "Kỹ năng bị từ chối",
                $"Minh chứng kỹ năng '{volunteerSkill.Skill?.Name ?? "của bạn"}' chưa đạt yêu cầu. Lý do: {dto.Note.Trim()}",
                "VolunteerSkillRejected",
                volunteerSkill.Id);
            return Ok(volunteerSkill);
        }

        [HttpPut("api/admin/volunteer-skill-verifications/{id}/request-changes")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RequestVolunteerSkillChanges(int id, [FromBody] AdminReviewDto? dto = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.Note) || dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Vui lòng nhập nội dung cần bổ sung tối thiểu 10 ký tự" });

            var volunteerSkill = await _context.VolunteerSkills
                .Include(vs => vs.Skill)
                .FirstOrDefaultAsync(vs => vs.Id == id);
            if (volunteerSkill == null) return NotFound();
            if (volunteerSkill.VerificationStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể yêu cầu bổ sung với kỹ năng đang chờ xác minh" });

            volunteerSkill.VerificationStatus = "ChangesRequested";
            volunteerSkill.VerificationReviewedAt = DateTime.UtcNow;
            volunteerSkill.VerificationReviewedBy = GetCurrentUserId();
            volunteerSkill.AdminNote = dto.Note.Trim();

            await _context.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerSkill.RequestChanges", "VolunteerSkill", volunteerSkill.Id, dto.Note);
            await _notificationService.SendAsync(
                volunteerSkill.UserId,
                "Minh chứng kỹ năng cần bổ sung",
                $"Minh chứng kỹ năng '{volunteerSkill.Skill?.Name ?? "của bạn"}' cần bổ sung. Nội dung: {dto.Note.Trim()}",
                "VolunteerSkillChangesRequested",
                volunteerSkill.Id);
            return Ok(volunteerSkill);
        }

        // ================= User Export Endpoint =================

        [HttpGet("api/admin/export/users")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> ExportUsers([FromQuery] string format = "json", [FromQuery] int maxRows = 5000)
        {
            maxRows = Math.Clamp(maxRows, 1, 10000);
            var totalRows = await _context.Users.CountAsync();
            if (totalRows > maxRows)
                return BadRequest(new { message = $"Export has {totalRows} rows. Refine filters or raise maxRows up to 10000.", totalRows, maxRows });

            var users = await _context.Users
                .OrderByDescending(u => u.Id)
                .Take(maxRows)
                .Select(u => new { u.Id, u.UserName, u.Name, u.Email, u.Phone, u.UserType, u.IsActive })
                .ToListAsync();

            if (format.ToLower() == "csv")
            {
                await RecordAuditAsync("Admin.Export.Users", "User", null, "Format=csv");
                var csv = new StringBuilder();
                csv.AppendLine("Id,Username,Name,Email,UserType,IsActive");
                foreach (var u in users)
                    csv.AppendLine($"{u.Id},{EscapeCsv(u.UserName)},{EscapeCsv(u.Name)},{EscapeCsv(u.Email)},{u.UserType},{u.IsActive}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "users.csv");
            }

            await RecordAuditAsync("Admin.Export.Users", "User", null, "Format=json");
            return Ok(users);
        }

        // ================= Helper Methods =================

        private Task RecordAuditAsync(string action, string entityType, int? entityId = null, string? metadata = null)
        {
            var userId = GetCurrentUserId();
            return _auditLogService.RecordAsync(
                userId,
                action,
                entityType,
                entityId,
                metadata,
                HttpContext.Connection.RemoteIpAddress?.ToString());
        }

        private int? GetCurrentUserId()
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsedUserId)
                ? parsedUserId
                : (int?)null;
        }

        private static string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            var trimmed = value.TrimStart();
            if (trimmed.Length > 0 && "=+-@".Contains(trimmed[0]))
                value = "'" + value;
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return $"\"{value.Replace("\"", "\"\"")}\"";
            return value;
        }
    }

    public class AdminReviewDto
    {
        public string? Note { get; set; }
    }
}
