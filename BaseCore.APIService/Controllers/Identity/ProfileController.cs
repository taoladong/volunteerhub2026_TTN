using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IVolunteerProfileRepositoryEF _profileRepo;
        private readonly ISkillRepositoryEF _skillRepo;
        private readonly IRegistrationRepositoryEF _registrationRepo;
        private readonly ICertificateRepositoryEF _certificateRepo;
        private readonly IAuditLogService _auditLogService;
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;

        public ProfileController(
            IVolunteerProfileRepositoryEF profileRepo,
            ISkillRepositoryEF skillRepo,
            IRegistrationRepositoryEF registrationRepo,
            ICertificateRepositoryEF certificateRepo,
            IAuditLogService auditLogService,
            BaseCore.Repository.EFCore.IUnitOfWork unitOfWork)
        {
            _profileRepo = profileRepo;
            _skillRepo = skillRepo;
            _registrationRepo = registrationRepo;
            _certificateRepo = certificateRepo;
            _auditLogService = auditLogService;
            _unitOfWork = unitOfWork;
        }

        [HttpGet("api/profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var profile = await _profileRepo.GetByUserIdAsync(userId);
            var skills = await _profileRepo.GetSkillsByUserIdAsync(userId);
            return Ok(new { profile, skills });
        }

        [HttpGet("api/profile/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var profile = await _profileRepo.GetByUserIdAsync(userId);
            var skills = await _profileRepo.GetSkillsByUserIdAsync(userId);
            if (profile == null) return NotFound(new { message = "Profile not found" });

            return Ok(new
            {
                profile = new
                {
                    profile.Id,
                    profile.UserId,
                    profile.TotalVolunteerHours,
                    profile.Bio,
                    profile.AvatarUrl,
                    profile.KycStatus,
                    user = profile.User == null ? null : new
                    {
                        profile.User.Id,
                        profile.User.Name,
                        profile.User.UserName,
                        profile.User.UserType
                    }
                },
                skills = skills.Select(s => new
                {
                    s.Id,
                    s.SkillId,
                    s.Level,
                    s.VerificationStatus,
                    skill = s.Skill == null ? null : new { s.Skill.Id, s.Skill.Name, s.Skill.Category }
                })
            });
        }

        [HttpPut("api/profile")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdateDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var validation = ValidateProfileUpdate(dto);
            if (validation != null) return BadRequest(new { message = validation });

            var profile = await _profileRepo.GetByUserIdAsync(userId);
            if (profile == null)
            {
                profile = new VolunteerProfile { UserId = userId };
                profile.BloodType = dto.BloodType?.Trim() ?? "";
                profile.Languages = dto.Languages?.Trim() ?? "";
                profile.Interests = dto.Interests?.Trim() ?? "";
                profile.Bio = dto.Bio?.Trim() ?? "";
                profile.AvatarUrl = dto.AvatarUrl?.Trim() ?? "";
                profile.KycStatus = "Unverified";
                await _profileRepo.AddAsync(profile);
            }
            else
            {
                profile.BloodType = dto.BloodType?.Trim() ?? profile.BloodType;
                profile.Languages = dto.Languages?.Trim() ?? profile.Languages;
                profile.Interests = dto.Interests?.Trim() ?? profile.Interests;
                profile.Bio = dto.Bio?.Trim() ?? profile.Bio;
                profile.AvatarUrl = dto.AvatarUrl?.Trim() ?? profile.AvatarUrl;
                await _profileRepo.UpdateAsync(profile);
            }
            await RecordAuditAsync(userId, "Profile.Update", "VolunteerProfile", profile.Id);
            return Ok(profile);
        }

        [HttpPost("api/profile/kyc")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> SubmitKyc([FromBody] KycSubmitDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.IdentityFrontImageUrl) ||
                string.IsNullOrWhiteSpace(dto.IdentityBackImageUrl) ||
                string.IsNullOrWhiteSpace(dto.PortraitImageUrl))
                return BadRequest(new { message = "Vui lòng upload mặt trước CCCD, mặt sau CCCD và ảnh chân dung." });

            var profile = await _profileRepo.GetByUserIdAsync(userId);
            if (profile == null)
            {
                profile = new VolunteerProfile { UserId = userId, BloodType = "", Languages = "", Interests = "", Bio = "", AvatarUrl = "" };
                await _profileRepo.AddAsync(profile);
            }
            if (!IsInternalUploadUrl(dto.IdentityFrontImageUrl) ||
                !IsInternalUploadUrl(dto.IdentityBackImageUrl) ||
                !IsInternalUploadUrl(dto.PortraitImageUrl))
                return BadRequest(new { message = "KYC images must be uploaded through the system" });
            if (profile.KycStatus == "Verified" && !dto.ConfirmReverify)
                return BadRequest(new { message = "Your KYC is already verified. Confirm re-verification before replacing identity images." });

            profile.IdentityFrontImageUrl = dto.IdentityFrontImageUrl.Trim();
            profile.IdentityBackImageUrl = dto.IdentityBackImageUrl.Trim();
            profile.PortraitImageUrl = dto.PortraitImageUrl.Trim();
            profile.KycStatus = "PendingVerification";
            profile.KycSubmittedAt = DateTime.UtcNow;
            profile.KycReviewedAt = null;
            profile.KycReviewedBy = null;
            profile.KycAdminNote = "";
            await _profileRepo.UpdateAsync(profile);
            await RecordAuditAsync(userId, "Profile.KycSubmit", "VolunteerProfile", profile.Id);
            return Ok(profile);
        }

        [HttpGet("api/profile/passport")]
        public async Task<IActionResult> GetPassport()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var profile = await _profileRepo.GetByUserIdAsync(userId);
            var skills = await _profileRepo.GetSkillsByUserIdAsync(userId);
            var registrations = await _registrationRepo.GetByUserAsync(userId);
            var passportRegistrations = registrations
                .Where(r => !string.Equals(r.Event?.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                .ToList();
            var certificates = await _certificateRepo.GetByUserAsync(userId);

            return Ok(new
            {
                profile,
                skills,
                totalEvents = passportRegistrations.Count(r => r.IsAttended),
                totalHours = profile?.TotalVolunteerHours ?? 0,
                registrations = passportRegistrations,
                certificates
            });
        }

        // SKILLS
        [HttpGet("api/skills")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllSkills() => Ok(await _skillRepo.GetAllAsync());

        [HttpPost("api/skills"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CreateSkill([FromBody] SkillDto dto)
        {
            var validation = ValidateSkill(dto);
            if (validation != null) return BadRequest(new { message = validation });

            var skill = new Skill { Name = dto.Name.Trim(), Category = dto.Category?.Trim() ?? "" };
            await _skillRepo.AddAsync(skill);
            await RecordAuditAsync(CurrentUserId(), "Skill.Create", "Skill", skill.Id, $"Name={skill.Name}");
            return Ok(skill);
        }

        [HttpPut("api/skills/{id}"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> UpdateSkill(int id, [FromBody] SkillDto dto)
        {
            var skill = await _skillRepo.GetByIdAsync(id);
            if (skill == null) return NotFound();
            var validation = ValidateSkill(dto);
            if (validation != null) return BadRequest(new { message = validation });

            skill.Name = dto.Name.Trim();
            skill.Category = dto.Category?.Trim() ?? skill.Category;
            await _skillRepo.UpdateAsync(skill);
            await RecordAuditAsync(CurrentUserId(), "Skill.Update", "Skill", skill.Id, $"Name={skill.Name}");
            return Ok(skill);
        }

        [HttpDelete("api/skills/{id}"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> DeleteSkill(int id)
        {
            var skill = await _skillRepo.GetByIdAsync(id);
            if (skill == null) return NotFound();
            try
            {
                // Cleanup Event.RequiredSkillIds JSON arrays that reference this skill
                var events = await _unitOfWork.Events.GetQueryable()
                    .Where(e => e.RequiredSkillIds != null && e.RequiredSkillIds != "" && e.RequiredSkillIds != "[]")
                    .ToListAsync();
                foreach (var ev in events)
                {
                    try
                    {
                        var ids = System.Text.Json.JsonSerializer.Deserialize<List<int>>(ev.RequiredSkillIds!) ?? new List<int>();
                        if (ids.Remove(id))
                        {
                            ev.RequiredSkillIds = ids.Count == 0 ? "[]" : System.Text.Json.JsonSerializer.Serialize(ids);
                        }
                    }
                    catch { /* ignore malformed JSON */ }
                }

                await _skillRepo.DeleteAsync(skill);
                await _unitOfWork.SaveChangesAsync();
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                return BadRequest(new { message = "Cannot delete a skill that volunteers are still using. Ask volunteers to remove it first." });
            }
            await RecordAuditAsync(CurrentUserId(), "Skill.Delete", "Skill", id);
            return Ok(new { message = "Deleted" });
        }

        [HttpPost("api/profile/skills")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> AddSkill([FromBody] AddSkillDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                if (dto.SkillId <= 0) return BadRequest(new { message = "Skill is required" });
                var skill = await _skillRepo.GetByIdAsync(dto.SkillId);
                if (skill == null) return NotFound(new { message = "Skill not found" });

                var existingSkills = await _profileRepo.GetSkillsByUserIdAsync(userId);
                if (existingSkills.Any(s => s.SkillId == dto.SkillId))
                    return BadRequest(new { message = "Skill already exists in profile" });
                if (!string.IsNullOrWhiteSpace(dto.EvidenceUrl) && !IsInternalUploadUrl(dto.EvidenceUrl))
                    return BadRequest(new { message = "Evidence must be uploaded through the system" });
                var levelError = ValidateSkillLevel(dto.Level);
                if (levelError != null) return BadRequest(new { message = levelError });
                if ((dto.VerificationNote?.Trim().Length ?? 0) > 500)
                    return BadRequest(new { message = "Verification note must be 500 characters or less" });

                var hasEvidence = !string.IsNullOrWhiteSpace(dto.EvidenceUrl);
                var vs = new VolunteerSkill
                {
                    UserId = userId,
                    SkillId = dto.SkillId,
                    Level = dto.Level ?? "Beginner",
                    EvidenceUrl = dto.EvidenceUrl?.Trim() ?? "",
                    VerificationNote = dto.VerificationNote?.Trim() ?? "",
                    VerificationStatus = hasEvidence ? "PendingVerification" : "SelfDeclared",
                    VerificationSubmittedAt = hasEvidence ? DateTime.UtcNow : null
                };
                await _profileRepo.AddSkillAsync(vs);
                await RecordAuditAsync(userId, "ProfileSkill.Add", "VolunteerSkill", vs.Id, $"SkillId={dto.SkillId}");
                return Ok(vs);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("api/profile/skills/{skillId}")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RemoveSkill(int skillId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            await _profileRepo.RemoveSkillAsync(userId, skillId);
            await RecordAuditAsync(userId, "ProfileSkill.Remove", "Skill", skillId);
            return Ok(new { message = "Skill removed" });
        }

        [HttpPut("api/profile/skills/{skillId}/verification")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> SubmitSkillVerification(int skillId, [FromBody] SkillVerificationSubmitDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.EvidenceUrl))
                return BadRequest(new { message = "Vui lòng upload hoặc nhập minh chứng kỹ năng." });

            var skills = await _profileRepo.GetSkillsByUserIdAsync(userId);
            if (!IsInternalUploadUrl(dto.EvidenceUrl))
                return BadRequest(new { message = "Evidence must be uploaded through the system" });
            if ((dto.VerificationNote?.Trim().Length ?? 0) > 500)
                return BadRequest(new { message = "Verification note must be 500 characters or less" });

            var vs = skills.FirstOrDefault(s => s.SkillId == skillId);
            if (vs == null) return NotFound(new { message = "Skill not found in profile" });

            vs.EvidenceUrl = dto.EvidenceUrl.Trim();
            vs.VerificationNote = dto.VerificationNote?.Trim() ?? "";
            vs.VerificationStatus = "PendingVerification";
            vs.VerificationSubmittedAt = DateTime.UtcNow;
            vs.VerificationReviewedAt = null;
            vs.VerificationReviewedBy = null;
            vs.AdminNote = "";
            await _profileRepo.UpdateSkillAsync(vs);
            await RecordAuditAsync(userId, "ProfileSkill.SubmitVerification", "VolunteerSkill", vs.Id, $"SkillId={skillId}");
            return Ok(vs);
        }

        private int? CurrentUserId()
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId)
                ? userId
                : (int?)null;
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

        private static string? ValidateSkill(SkillDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return "Skill name is required";
            if (dto.Name.Trim().Length > 100)
                return "Skill name must be 100 characters or less";
            if ((dto.Category?.Length ?? 0) > 100)
                return "Skill category must be 100 characters or less";

            return null;
        }

        private static string? ValidateProfileUpdate(ProfileUpdateDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.BloodType) &&
                !new[] { "A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-" }.Contains(dto.BloodType.Trim(), StringComparer.OrdinalIgnoreCase))
                return "Blood type is invalid";
            if ((dto.Languages?.Trim().Length ?? 0) > 300)
                return "Languages must be 300 characters or less";
            if ((dto.Interests?.Trim().Length ?? 0) > 300)
                return "Interests must be 300 characters or less";
            if ((dto.Bio?.Trim().Length ?? 0) > 1000)
                return "Bio must be 1000 characters or less";
            if (!string.IsNullOrWhiteSpace(dto.AvatarUrl) && !IsInternalUploadUrl(dto.AvatarUrl))
                return "Avatar must be uploaded through the system";

            return null;
        }

        private static string? ValidateSkillLevel(string? level)
        {
            if (string.IsNullOrWhiteSpace(level)) return null;
            return new[] { "Beginner", "Intermediate", "Expert" }.Contains(level.Trim(), StringComparer.OrdinalIgnoreCase)
                ? null
                : "Skill level is invalid";
        }

        private static bool IsInternalUploadUrl(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            var trimmed = value.Trim();
            if (trimmed.Length > 500) return false;
            if (trimmed.Contains('\\')) return false;
            if (Regex.IsMatch(trimmed, @"^[a-zA-Z][a-zA-Z0-9+.-]*:")) return false;
            return trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
                   trimmed.StartsWith("/api/uploads/", StringComparison.OrdinalIgnoreCase);
        }
    }

    public class ProfileUpdateDto
    {
        public string? BloodType { get; set; }
        public string? Languages { get; set; }
        public string? Interests { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class KycSubmitDto
    {
        public string IdentityFrontImageUrl { get; set; } = "";
        public string IdentityBackImageUrl { get; set; } = "";
        public string PortraitImageUrl { get; set; } = "";
        public bool ConfirmReverify { get; set; } = false;
    }

    public class SkillDto
    {
        public string Name { get; set; } = "";
        public string? Category { get; set; }
    }

    public class AddSkillDto
    {
        public int SkillId { get; set; }
        public string? Level { get; set; }
        public string? EvidenceUrl { get; set; }
        public string? VerificationNote { get; set; }
    }

    public class SkillVerificationSubmitDto
    {
        public string EvidenceUrl { get; set; } = "";
        public string? VerificationNote { get; set; }
    }
}






