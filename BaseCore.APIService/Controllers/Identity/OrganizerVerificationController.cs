using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services.VolunteerHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class OrganizerVerificationController : ControllerBase
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;

        public OrganizerVerificationController(
            BaseCore.Repository.EFCore.IUnitOfWork unitOfWork,
            IAuditLogService auditLogService,
            INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
        }

        [HttpGet("api/organizer/verification")]
        [Authorize(Roles = "Organizer")]
        public async Task<IActionResult> GetMine()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var verification = await _unitOfWork.OrganizerVerifications.GetQueryable()
                .Where(v => v.OrganizerId == userId)
                .Select(v => ToResponse(v))
                .FirstOrDefaultAsync();

            return Ok(verification ?? new OrganizerVerificationResponse
            {
                OrganizerId = userId,
                Status = "Unverified",
                CanCreateEvents = false
            });
        }

        [HttpPost("api/organizer/verification")]
        [Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Submit([FromBody] OrganizerVerificationSubmitDto dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var validationError = ValidateSubmission(dto);
            if (validationError != null) return BadRequest(new { message = validationError });

            var verification = await _unitOfWork.OrganizerVerifications.GetQueryable()
                .FirstOrDefaultAsync(v => v.OrganizerId == userId);

            if (verification == null)
            {
                verification = new OrganizerVerification
                {
                    OrganizerId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.OrganizerVerifications.AddAsync(verification);
            }

            ApplySubmission(verification, dto);
            verification.Status = "PendingVerification";
            verification.SubmittedAt = DateTime.UtcNow;
            verification.UpdatedAt = DateTime.UtcNow;
            verification.AdminNote = "";
            verification.RejectReason = "";
            verification.VerifiedAt = null;
            verification.VerifiedBy = null;

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync(userId, "OrganizerVerification.Submit", "OrganizerVerification", verification.Id, $"Status={verification.Status}");

            return Ok(ToResponse(verification));
        }

        [HttpGet("api/admin/organizer-verifications")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var query = _unitOfWork.OrganizerVerifications.GetQueryable()
                .Include(v => v.Organizer)
                .Include(v => v.Verifier)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(v => v.Status == status);
            }

            var items = await query
                .OrderBy(v => v.Status == "PendingVerification" ? 0 : v.Status == "ChangesRequested" ? 1 : 2)
                .ThenByDescending(v => v.SubmittedAt)
                .Select(v => ToResponse(v))
                .ToListAsync();

            return Ok(items);
        }

        [HttpPut("api/admin/organizer-verifications/{id}/approve")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Approve(int id, [FromBody] OrganizerVerificationReviewDto dto)
        {
            if (!TryGetUserId(out var adminId)) return Unauthorized();

            var verification = await _unitOfWork.OrganizerVerifications.GetQueryable()
                .Include(v => v.Organizer)
                .FirstOrDefaultAsync(v => v.Id == id);
            if (verification == null) return NotFound(new { message = "Verification request not found" });
            if (verification.Status != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể duyệt hồ sơ tổ chức đang chờ xác minh" });

            verification.Status = "Verified";
            verification.AdminNote = dto?.Note?.Trim() ?? "";
            verification.RejectReason = "";
            verification.VerifiedAt = DateTime.UtcNow;
            verification.VerifiedBy = adminId;
            verification.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync(adminId, "OrganizerVerification.Approve", "OrganizerVerification", verification.Id, $"OrganizerId={verification.OrganizerId}");
            await _notificationService.SendAsync(
                verification.OrganizerId,
                "Hồ sơ tổ chức đã được xác minh",
                $"Hồ sơ tổ chức '{verification.OrganizationName}' đã được duyệt. Bạn có thể tạo và gửi sự kiện để admin duyệt.",
                "OrganizerVerificationApproved",
                verification.Id);

            return Ok(ToResponse(verification));
        }

        [HttpPut("api/admin/organizer-verifications/{id}/reject")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Reject(int id, [FromBody] OrganizerVerificationReviewDto dto)
        {
            return await ReviewAsNeedsAction(id, dto, "Rejected", "OrganizerVerification.Reject");
        }

        [HttpPut("api/admin/organizer-verifications/{id}/request-changes")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RequestChanges(int id, [FromBody] OrganizerVerificationReviewDto dto)
        {
            return await ReviewAsNeedsAction(id, dto, "ChangesRequested", "OrganizerVerification.RequestChanges");
        }

        private async Task<IActionResult> ReviewAsNeedsAction(int id, OrganizerVerificationReviewDto dto, string status, string action)
        {
            if (!TryGetUserId(out var adminId)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Note))
                return BadRequest(new { message = "Vui lòng nhập lý do để organizer biết cần xử lý gì." });
            if (dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Lý do phải có ít nhất 10 ký tự." });

            var verification = await _unitOfWork.OrganizerVerifications.GetQueryable()
                .Include(v => v.Organizer)
                .FirstOrDefaultAsync(v => v.Id == id);
            if (verification == null) return NotFound(new { message = "Verification request not found" });
            if (verification.Status != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể xử lý hồ sơ tổ chức đang chờ xác minh" });

            verification.Status = status;
            verification.AdminNote = dto.Note.Trim();
            verification.RejectReason = dto.Note.Trim();
            verification.VerifiedAt = null;
            verification.VerifiedBy = null;
            verification.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync(adminId, action, "OrganizerVerification", verification.Id, $"OrganizerId={verification.OrganizerId}");
            await _notificationService.SendAsync(
                verification.OrganizerId,
                status == "Rejected" ? "Hồ sơ tổ chức bị từ chối" : "Hồ sơ tổ chức cần bổ sung",
                status == "Rejected"
                    ? $"Hồ sơ tổ chức '{verification.OrganizationName}' bị từ chối. Lý do: {dto.Note.Trim()}"
                    : $"Hồ sơ tổ chức '{verification.OrganizationName}' cần bổ sung thông tin. Ghi chú: {dto.Note.Trim()}",
                status == "Rejected" ? "OrganizerVerificationRejected" : "OrganizerVerificationChangesRequested",
                verification.Id);

            return Ok(ToResponse(verification));
        }

        private bool TryGetUserId(out int userId)
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out userId);
        }

        private static string? ValidateSubmission(OrganizerVerificationSubmitDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.OrganizationName)) return "Vui lòng nhập tên tổ chức.";
            if (string.IsNullOrWhiteSpace(dto.RepresentativeName)) return "Vui lòng nhập người đại diện.";
            if (string.IsNullOrWhiteSpace(dto.ContactEmail)) return "Vui lòng nhập email liên hệ.";
            if (string.IsNullOrWhiteSpace(dto.Description)) return "Vui lòng mô tả ngắn về tổ chức.";
            if (!dto.CommitmentAccepted) return "Bạn cần cam kết chịu trách nhiệm về thông tin tổ chức.";
            return null;
        }

        private static void ApplySubmission(OrganizerVerification verification, OrganizerVerificationSubmitDto dto)
        {
            verification.OrganizationName = dto.OrganizationName.Trim();
            verification.RepresentativeName = dto.RepresentativeName.Trim();
            verification.ContactEmail = dto.ContactEmail.Trim();
            verification.Phone = dto.Phone?.Trim() ?? "";
            verification.Address = dto.Address?.Trim() ?? "";
            verification.WebsiteUrl = dto.WebsiteUrl?.Trim() ?? "";
            verification.Description = dto.Description.Trim();
            verification.DocumentUrl = dto.DocumentUrl?.Trim() ?? "";
            verification.VerificationNote = dto.VerificationNote?.Trim() ?? "";
            verification.CommitmentAccepted = dto.CommitmentAccepted;
        }

        private static OrganizerVerificationResponse ToResponse(OrganizerVerification v)
        {
            return new OrganizerVerificationResponse
            {
                Id = v.Id,
                OrganizerId = v.OrganizerId,
                OrganizerName = v.Organizer?.Name ?? "",
                OrganizerUserName = v.Organizer?.UserName ?? "",
                OrganizationName = v.OrganizationName,
                RepresentativeName = v.RepresentativeName,
                ContactEmail = v.ContactEmail,
                Phone = v.Phone,
                Address = v.Address,
                WebsiteUrl = v.WebsiteUrl,
                Description = v.Description,
                DocumentUrl = v.DocumentUrl,
                VerificationNote = v.VerificationNote,
                CommitmentAccepted = v.CommitmentAccepted,
                Status = v.Status,
                AdminNote = v.AdminNote,
                RejectReason = v.RejectReason,
                SubmittedAt = v.SubmittedAt,
                CreatedAt = v.CreatedAt,
                UpdatedAt = v.UpdatedAt,
                VerifiedAt = v.VerifiedAt,
                VerifiedBy = v.VerifiedBy,
                VerifierName = v.Verifier?.Name ?? "",
                CanCreateEvents = v.Status == "Verified"
            };
        }

        private Task RecordAuditAsync(int? userId, string action, string entityType, int? entityId = null, string? metadata = null)
        {
            return _auditLogService.RecordAsync(
                userId,
                action,
                entityType,
                entityId,
                metadata,
                HttpContext.Connection.RemoteIpAddress?.ToString());
        }
    }

    public class OrganizerVerificationSubmitDto
    {
        public string OrganizationName { get; set; } = "";
        public string RepresentativeName { get; set; } = "";
        public string ContactEmail { get; set; } = "";
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? WebsiteUrl { get; set; }
        public string Description { get; set; } = "";
        public string? DocumentUrl { get; set; }
        public string? VerificationNote { get; set; }
        public bool CommitmentAccepted { get; set; }
    }

    public class OrganizerVerificationReviewDto
    {
        public string? Note { get; set; }
    }

    public class OrganizerVerificationResponse
    {
        public int Id { get; set; }
        public int OrganizerId { get; set; }
        public string OrganizerName { get; set; } = "";
        public string OrganizerUserName { get; set; } = "";
        public string OrganizationName { get; set; } = "";
        public string RepresentativeName { get; set; } = "";
        public string ContactEmail { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public string WebsiteUrl { get; set; } = "";
        public string Description { get; set; } = "";
        public string DocumentUrl { get; set; } = "";
        public string VerificationNote { get; set; } = "";
        public bool CommitmentAccepted { get; set; }
        public string Status { get; set; } = "";
        public string AdminNote { get; set; } = "";
        public string RejectReason { get; set; } = "";
        public DateTime SubmittedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public int? VerifiedBy { get; set; }
        public string VerifierName { get; set; } = "";
        public bool CanCreateEvents { get; set; }
    }
}






