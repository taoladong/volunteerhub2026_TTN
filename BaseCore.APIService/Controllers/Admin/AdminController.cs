using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BaseCore.Repository;
using BaseCore.Services.VolunteerHub;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using BaseCore.Common;
using BaseCore.Entities;

namespace BaseCore.APIService.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;
        private readonly IEventService _eventService;

        public AdminController(
            BaseCore.Repository.EFCore.IUnitOfWork unitOfWork,
            IAuditLogService auditLogService,
            INotificationService notificationService,
            IEventService eventService)
        {
            _unitOfWork = unitOfWork;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
            _eventService = eventService;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? keyword,
            [FromQuery] int? userType,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _unitOfWork.Users.GetQueryable().AsQueryable();
            if (!string.IsNullOrEmpty(keyword))
                query = query.Where(u => u.UserName.Contains(keyword) || u.Name.Contains(keyword) || u.Email.Contains(keyword));
            if (userType.HasValue)
                query = query.Where(u => u.UserType == userType.Value);
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var total = await query.CountAsync();
            var users = await query.OrderByDescending(u => u.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(u => new { u.Id, u.UserName, u.Name, u.Email, u.UserType, u.IsActive })
                .ToListAsync();

            return Ok(new { items = users, totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        }

        [HttpPut("users/{id}/toggle-status")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ToggleUserStatus(int id)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == id)
                return BadRequest(new { message = "Admin không thể tự khóa tài khoản của chính mình" });

            var user = await (_unitOfWork.Users.GetByIdAsync(id));
            if (user == null) return NotFound();
            if (user.UserType == 3)
                return BadRequest(new { message = "Không thể khóa hoặc mở khóa tài khoản Admin bằng chức năng này" });

            user.IsActive = !user.IsActive;
            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync("Admin.User.ToggleStatus", "User", user.Id, $"IsActive={user.IsActive}");

            await _notificationService.SendAsync(
                user.Id,
                user.IsActive ? "Tài khoản đã được mở lại" : "Tài khoản đã bị khóa",
                user.IsActive
                    ? "Admin đã mở lại tài khoản của bạn. Các event, chiến dịch hoặc đề nghị tài trợ đã bị hủy trước đó không được rollback tự động."
                    : "Admin đã khóa tài khoản của bạn. Các hoạt động đang mở có thể bị hủy để tránh phát sinh dữ liệu treo.",
                user.IsActive ? "UserReactivated" : "UserDeactivated",
                user.Id);

            // Impact summary when deactivating — non-destructive; the admin decides next steps.
            object? impact = null;
            if (!user.IsActive)
            {
                var now = DateTime.UtcNow;
                if (user.UserType == 1) // Organizer
                {
                    var activeEvents = await _unitOfWork.Events.GetQueryable()
                        .Where(e => e.OrganizerId == id && (e.Status == "Pending" || e.Status == "Approved"))
                        .Select(e => new { e.Id, e.Title, e.Status })
                        .ToListAsync();
                    foreach (var ev in activeEvents)
                    {
                        try
                        {
                            await _eventService.CancelAsync(ev.Id, null, "Organizer account deactivated by admin");
                        }
                        catch
                        {
                            // Deactivation must stay resilient; unresolved events are still visible in admin audit.
                        }
                    }

                    var campaigns = await _unitOfWork.SupportCampaigns.GetQueryable()
                        .Include(c => c.Event)
                        .Where(c => c.Event.OrganizerId == id && (c.Status == "Draft" || c.Status == "Open"))
                        .ToListAsync();
                    var campaignIds = campaigns.Select(c => c.Id).ToList();
                    var pendingDonations = await _unitOfWork.IndividualDonations.GetQueryable()
                        .Include(d => d.Campaign)
                        .Where(d => campaignIds.Contains(d.CampaignId) && d.Status == "PendingConfirmation")
                        .ToListAsync();
                    var proposals = await _unitOfWork.SponsorshipProposals.GetQueryable()
                        .Include(p => p.Event)
                        .Where(p => p.OrganizerId == id && (p.Status == "Pending" || p.Status == "Accepted"))
                        .ToListAsync();

                    foreach (var c in campaigns)
                    {
                        c.Status = "Cancelled";
                        c.UpdatedAt = now;
                    }
                    foreach (var d in pendingDonations)
                    {
                        d.Status = "Cancelled";
                        d.RejectedReason = "Organizer account deactivated";
                        d.UpdatedAt = now;
                    }
                    foreach (var p in proposals)
                    {
                        p.Status = "Cancelled";
                        p.CancelledAt = now;
                        p.ResponseMessage = "Organizer account deactivated by admin";
                    }
                    await _unitOfWork.SaveChangesAsync();

                    foreach (var d in pendingDonations)
                    {
                        await _notificationService.SendAsync(d.UserId, "Khoản ủng hộ đã bị hủy", $"Khoản ủng hộ chờ xác nhận cho đợt '{d.Campaign.Title}' đã bị hủy vì tài khoản ban tổ chức bị khóa.", "DonationCancelled", d.CampaignId);
                    }
                    foreach (var p in proposals)
                    {
                        await _notificationService.SendAsync(p.SponsorId, "Đề nghị tài trợ đã bị hủy", $"Đề nghị tài trợ '{p.Title}' cho sự kiện '{p.Event.Title}' đã bị hủy vì tài khoản ban tổ chức bị khóa.", "SponsorshipProposalCancelled", p.Id);
                    }

                    impact = new
                    {
                        role = "Organizer",
                        cancelledEvents = activeEvents.Count,
                        cancelledCampaigns = campaigns.Count,
                        cancelledPendingDonations = pendingDonations.Count,
                        cancelledProposals = proposals.Count
                    };
                }
                else if (user.UserType == 2) // Sponsor
                {
                    var proposals = await _unitOfWork.SponsorshipProposals.GetQueryable()
                        .Include(p => p.Event)
                        .Where(p => p.SponsorId == id && (p.Status == "Pending" || p.Status == "Accepted"))
                        .ToListAsync();
                    foreach (var p in proposals)
                    {
                        p.Status = "Cancelled";
                        p.CancelledAt = now;
                        p.ResponseMessage = "Sponsor account deactivated by admin";
                    }
                    await _unitOfWork.SaveChangesAsync();
                    foreach (var p in proposals)
                    {
                        await _notificationService.SendAsync(p.OrganizerId, "Đề nghị tài trợ đã bị hủy", $"Đề nghị tài trợ '{p.Title}' cho sự kiện '{p.Event.Title}' đã bị hủy vì tài khoản sponsor bị khóa.", "SponsorshipProposalCancelled", p.Id);
                    }

                    impact = new
                    {
                        role = "Sponsor",
                        cancelledProposals = proposals.Count
                    };
                }
                else if (user.UserType == 0) // Volunteer
                {
                    var pendingDonations = await _unitOfWork.IndividualDonations.GetQueryable()
                        .Include(d => d.Campaign).ThenInclude(c => c.Event)
                        .Where(d => d.UserId == id && d.Status == "PendingConfirmation")
                        .ToListAsync();
                    foreach (var d in pendingDonations)
                    {
                        d.Status = "Cancelled";
                        d.RejectedReason = "Volunteer account deactivated";
                        d.UpdatedAt = now;
                    }
                    await _unitOfWork.SaveChangesAsync();
                    foreach (var d in pendingDonations)
                    {
                        await _notificationService.SendAsync(d.Campaign.Event.OrganizerId, "Khoản ủng hộ đã bị hủy", $"Một khoản ủng hộ chờ xác nhận cho đợt '{d.Campaign.Title}' đã bị hủy vì tài khoản volunteer bị khóa.", "DonationCancelled", d.CampaignId);
                    }

                    impact = new
                    {
                        role = "Volunteer",
                        cancelledPendingDonations = pendingDonations.Count
                    };
                }
            }
            else
            {
                var cancelledCampaigns = await _unitOfWork.SupportCampaigns.GetQueryable()
                    .Include(c => c.Event)
                    .CountAsync(c => c.Event.OrganizerId == id && c.Status == "Cancelled");
                var cancelledProposals = await _unitOfWork.SponsorshipProposals.GetQueryable()
                    .CountAsync(p => (p.OrganizerId == id || p.SponsorId == id) && p.Status == "Cancelled");
                var cancelledEvents = await _unitOfWork.Events.GetQueryable()
                    .CountAsync(e => e.OrganizerId == id && e.Status == "Cancelled");

                impact = new
                {
                    role = user.UserType == 1 ? "Organizer" : user.UserType == 2 ? "Sponsor" : "Volunteer",
                    note = "Tài khoản đã mở lại, nhưng các dữ liệu đã bị hủy khi khóa không được rollback tự động.",
                    cancelledEvents,
                    cancelledCampaigns,
                    cancelledProposals
                };
            }

            return Ok(new { id = user.Id, isActive = user.IsActive, impact });
        }

        [HttpPost("users")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserDto dto)
        {
            var validation = ValidateAdminCreateUser(dto);
            if (validation != null) return BadRequest(new { message = validation });

            var username = dto.UserName.Trim();
            var email = dto.Email.Trim().ToLowerInvariant();
            var exists = await _unitOfWork.Users.GetQueryable().AnyAsync(u => u.UserName == username || u.Email == email);
            if (exists) return BadRequest(new { message = "Username or email already exists" });

            var user = new User
            {
                UserName = username,
                Name = string.IsNullOrWhiteSpace(dto.Name) ? username : dto.Name.Trim(),
                Email = email,
                Phone = dto.Phone?.Trim() ?? "",
                Contact = dto.Phone?.Trim() ?? "",
                Position = "",
                Image = "",
                UserType = dto.UserType,
                IsActive = dto.IsActive ?? true,
                Created = DateTime.UtcNow
            };
            user.Password = TokenHelper.HashPassword(dto.Password, out var salt);
            user.Salt = salt;

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync("Admin.User.Create", "User", user.Id, $"UserType={user.UserType};IsActive={user.IsActive}");

            return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, new
            {
                user.Id,
                user.UserName,
                user.Name,
                user.Email,
                user.Phone,
                user.UserType,
                user.IsActive
            });
        }

        [HttpGet("volunteer-kyc")]
        public async Task<IActionResult> GetVolunteerKycRequests([FromQuery] string? status = "PendingVerification")
        {
            var query = _unitOfWork.VolunteerProfiles.GetQueryable()
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

        [HttpPut("volunteer-kyc/{profileId}/approve")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ApproveVolunteerKyc(int profileId, [FromBody] AdminReviewDto? dto = null)
        {
            var profile = await _unitOfWork.VolunteerProfiles.GetQueryable()
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == profileId);
            if (profile == null) return NotFound();
            if (profile.KycStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể duyệt hồ sơ KYC đang chờ xác minh" });

            profile.KycStatus = "Verified";
            profile.KycReviewedAt = DateTime.UtcNow;
            profile.KycReviewedBy = GetCurrentUserId();
            profile.KycAdminNote = dto?.Note ?? "";

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerKyc.Approve", "VolunteerProfile", profile.Id, dto?.Note);
            await _notificationService.SendAsync(
                profile.UserId,
                "KYC đã được xác minh",
                "Hồ sơ xác thực danh tính của bạn đã được duyệt. Bạn có thể đăng ký các sự kiện yêu cầu KYC.",
                "VolunteerKycApproved",
                profile.Id);
            return Ok(profile);
        }

        [HttpPut("volunteer-kyc/{profileId}/reject")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RejectVolunteerKyc(int profileId, [FromBody] AdminReviewDto? dto = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.Note) || dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Vui lòng nhập lý do từ chối KYC tối thiểu 10 ký tự" });

            var profile = await _unitOfWork.VolunteerProfiles.GetQueryable()
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == profileId);
            if (profile == null) return NotFound();
            if (profile.KycStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể từ chối hồ sơ KYC đang chờ xác minh" });

            profile.KycStatus = "Rejected";
            profile.KycReviewedAt = DateTime.UtcNow;
            profile.KycReviewedBy = GetCurrentUserId();
            profile.KycAdminNote = dto.Note.Trim();

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerKyc.Reject", "VolunteerProfile", profile.Id, dto.Note);
            await _notificationService.SendAsync(
                profile.UserId,
                "KYC bị từ chối",
                $"Hồ sơ xác thực danh tính của bạn chưa đạt yêu cầu. Lý do: {dto.Note.Trim()}",
                "VolunteerKycRejected",
                profile.Id);
            return Ok(profile);
        }

        [HttpGet("volunteer-skill-verifications")]
        public async Task<IActionResult> GetVolunteerSkillVerifications([FromQuery] string? status = "PendingVerification")
        {
            var query = _unitOfWork.VolunteerSkills.GetQueryable()
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

        [HttpPut("volunteer-skill-verifications/{id}/approve")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ApproveVolunteerSkill(int id, [FromBody] AdminReviewDto? dto = null)
        {
            var volunteerSkill = await _unitOfWork.VolunteerSkills.GetQueryable()
                .Include(vs => vs.Skill)
                .FirstOrDefaultAsync(vs => vs.Id == id);
            if (volunteerSkill == null) return NotFound();
            if (volunteerSkill.VerificationStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể duyệt kỹ năng đang chờ xác minh" });

            volunteerSkill.VerificationStatus = "Verified";
            volunteerSkill.VerificationReviewedAt = DateTime.UtcNow;
            volunteerSkill.VerificationReviewedBy = GetCurrentUserId();
            volunteerSkill.AdminNote = dto?.Note ?? "";

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerSkill.Approve", "VolunteerSkill", volunteerSkill.Id, dto?.Note);
            await _notificationService.SendAsync(
                volunteerSkill.UserId,
                "Kỹ năng đã được xác minh",
                $"Kỹ năng '{volunteerSkill.Skill?.Name ?? "của bạn"}' đã được admin xác minh.",
                "VolunteerSkillApproved",
                volunteerSkill.Id);
            return Ok(volunteerSkill);
        }

        [HttpPut("volunteer-skill-verifications/{id}/reject")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RejectVolunteerSkill(int id, [FromBody] AdminReviewDto? dto = null)
        {
            if (string.IsNullOrWhiteSpace(dto?.Note) || dto.Note.Trim().Length < 10)
                return BadRequest(new { message = "Vui lòng nhập lý do từ chối kỹ năng tối thiểu 10 ký tự" });

            var volunteerSkill = await _unitOfWork.VolunteerSkills.GetQueryable()
                .Include(vs => vs.Skill)
                .FirstOrDefaultAsync(vs => vs.Id == id);
            if (volunteerSkill == null) return NotFound();
            if (volunteerSkill.VerificationStatus != "PendingVerification")
                return BadRequest(new { message = "Chỉ có thể từ chối kỹ năng đang chờ xác minh" });

            volunteerSkill.VerificationStatus = "Rejected";
            volunteerSkill.VerificationReviewedAt = DateTime.UtcNow;
            volunteerSkill.VerificationReviewedBy = GetCurrentUserId();
            volunteerSkill.AdminNote = dto.Note.Trim();

            await _unitOfWork.SaveChangesAsync();
            await RecordAuditAsync("Admin.VolunteerSkill.Reject", "VolunteerSkill", volunteerSkill.Id, dto.Note);
            await _notificationService.SendAsync(
                volunteerSkill.UserId,
                "Kỹ năng bị từ chối",
                $"Minh chứng kỹ năng '{volunteerSkill.Skill?.Name ?? "của bạn"}' chưa đạt yêu cầu. Lý do: {dto.Note.Trim()}",
                "VolunteerSkillRejected",
                volunteerSkill.Id);
            return Ok(volunteerSkill);
        }

        [HttpGet("export/events")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> ExportEvents([FromQuery] string format = "json", [FromQuery] int maxRows = 5000)
        {
            maxRows = Math.Clamp(maxRows, 1, 10000);
            var totalRows = await _unitOfWork.Events.GetQueryable().CountAsync();
            if (totalRows > maxRows)
                return BadRequest(new { message = $"Export has {totalRows} rows. Refine filters or raise maxRows up to 10000.", totalRows, maxRows });

            var events = await _unitOfWork.Events.GetQueryable()
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .OrderByDescending(e => e.CreatedAt)
                .Take(maxRows)
                .Select(e => new
                {
                    e.Id, e.Title, e.Status, e.Location,
                    e.StartDate, e.EndDate, e.MinParticipants, e.MaxParticipants, e.CurrentParticipants,
                    Category = e.Category != null ? e.Category.Name : "",
                    Organizer = e.Organizer != null ? e.Organizer.Name : "",
                    e.CreatedAt
                })
                .ToListAsync();

            if (format.ToLower() == "csv")
            {
                await RecordAuditAsync("Admin.Export.Events", "Event", null, "Format=csv");
                var csv = new StringBuilder();
                csv.AppendLine("Id,Title,Status,Location,StartDate,EndDate,MinParticipants,MaxParticipants,CurrentParticipants,Category,Organizer,CreatedAt");
                foreach (var e in events)
                    csv.AppendLine($"{e.Id},{EscapeCsv(e.Title)},{e.Status},{EscapeCsv(e.Location)},{e.StartDate:yyyy-MM-dd},{e.EndDate:yyyy-MM-dd},{e.MinParticipants},{e.MaxParticipants},{e.CurrentParticipants},{EscapeCsv(e.Category)},{EscapeCsv(e.Organizer)},{e.CreatedAt:yyyy-MM-dd}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "events.csv");
            }

            await RecordAuditAsync("Admin.Export.Events", "Event", null, "Format=json");
            return Ok(events);
        }

        [HttpGet("export/users")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> ExportUsers([FromQuery] string format = "json", [FromQuery] int maxRows = 5000)
        {
            maxRows = Math.Clamp(maxRows, 1, 10000);
            var totalRows = await _unitOfWork.Users.GetQueryable().CountAsync();
            if (totalRows > maxRows)
                return BadRequest(new { message = $"Export has {totalRows} rows. Refine filters or raise maxRows up to 10000.", totalRows, maxRows });

            var users = await _unitOfWork.Users.GetQueryable()
                .OrderByDescending(u => u.Id)
                .Take(maxRows)
                .Select(u => new { u.Id, u.UserName, u.Name, u.Email, u.UserType, u.IsActive })
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

        [HttpGet("finance/overview")]
        public async Task<IActionResult> GetFinanceOverview()
        {
            var donationConfirmedAmount = await _unitOfWork.IndividualDonations.GetQueryable()
                .Where(d => d.Status == "Confirmed")
                .SumAsync(d => (decimal?)d.Amount) ?? 0;
            var donationPendingAmount = await _unitOfWork.IndividualDonations.GetQueryable()
                .Where(d => d.Status == "PendingConfirmation")
                .SumAsync(d => (decimal?)d.Amount) ?? 0;
            var sponsorshipReceivedAmount = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Where(p => p.Status == "Received" || p.Status == "Reported")
                .SumAsync(p => p.ActualReceivedAmount ?? (p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0));

            return Ok(new
            {
                totals = new
                {
                    campaigns = await _unitOfWork.SupportCampaigns.GetQueryable().CountAsync(),
                    donations = await _unitOfWork.IndividualDonations.GetQueryable().CountAsync(),
                    proposals = await _unitOfWork.SponsorshipProposals.GetQueryable().CountAsync(),
                    donationConfirmedAmount,
                    donationPendingAmount,
                    sponsorshipReceivedAmount,
                    financialConfirmedAmount = donationConfirmedAmount + sponsorshipReceivedAmount
                },
                recentDonations = await _unitOfWork.IndividualDonations.GetQueryable()
                    .Include(d => d.Campaign)
                    .ThenInclude(c => c.Event)
                    .OrderByDescending(d => d.CreatedAt)
                    .Take(10)
                    .Select(d => new { d.Id, d.Amount, d.Status, d.DisplayName, campaign = d.Campaign.Title, eventTitle = d.Campaign.Event.Title, d.CreatedAt })
                    .ToListAsync(),
                recentProposals = await _unitOfWork.SponsorshipProposals.GetQueryable()
                    .Include(p => p.Event)
                    .Include(p => p.Sponsor)
                    .OrderByDescending(p => p.CreatedAt)
                    .Take(10)
                    .Select(p => new { p.Id, p.Title, p.Type, p.Status, sponsor = p.Sponsor.Name, eventTitle = p.Event.Title, amount = p.ActualReceivedAmount ?? (p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0), p.CreatedAt })
                    .ToListAsync()
            });
        }

        [HttpGet("finance/open-proposals-past-event")]
        public async Task<IActionResult> GetOpenProposalsPastEvent()
        {
            var items = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .AsNoTracking()
                .Include(p => p.Event)
                .Include(p => p.Sponsor)
                .Include(p => p.Organizer)
                .Where(p => (p.Status == "Pending" || p.Status == "Accepted")
                         && (p.Event.Status == "Completed" || p.Event.Status == "Cancelled"))
                .OrderBy(p => p.Event.EndDate)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Type,
                    p.Status,
                    p.EventId,
                    eventTitle = p.Event.Title,
                    eventStatus = p.Event.Status,
                    eventEndDate = p.Event.EndDate,
                    sponsorName = p.Sponsor.Name ?? p.Sponsor.UserName,
                    organizerName = p.Organizer.Name ?? p.Organizer.UserName,
                    amount = p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0,
                    daysSinceEnd = (int)(DateTime.UtcNow - p.Event.EndDate).TotalDays
                })
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("finance/stale-donations")]
        public async Task<IActionResult> GetStaleDonations([FromQuery] int days = 7)
        {
            if (days < 1) days = 7;
            var cutoff = DateTime.UtcNow.AddDays(-days);

            var items = await _unitOfWork.IndividualDonations.GetQueryable()
                .AsNoTracking()
                .Include(d => d.Campaign).ThenInclude(c => c.Event).ThenInclude(e => e.Organizer)
                .Include(d => d.User)
                .Where(d => d.Status == "PendingConfirmation" && d.CreatedAt <= cutoff)
                .OrderBy(d => d.CreatedAt)
                .Select(d => new
                {
                    d.Id,
                    d.CampaignId,
                    campaignTitle = d.Campaign.Title,
                    eventId = d.Campaign.EventId,
                    eventTitle = d.Campaign.Event.Title,
                    organizerId = d.Campaign.Event.OrganizerId,
                    organizerName = d.Campaign.Event.Organizer.Name ?? d.Campaign.Event.Organizer.UserName,
                    d.Amount,
                    donorName = d.IsAnonymous ? "Ẩn danh" : d.DisplayName,
                    donorUserId = d.UserId,
                    donorUserName = d.User.UserName,
                    d.CreatedAt,
                    ageInDays = (int)(DateTime.UtcNow - d.CreatedAt).TotalDays
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("finance/unreported-campaigns")]
        public async Task<IActionResult> GetUnreportedCampaigns()
        {
            var items = await _unitOfWork.SupportCampaigns.GetQueryable()
                .AsNoTracking()
                .Include(c => c.Event)
                .Where(c => c.Status != "Cancelled" && c.Status != "Reported" && c.ReportedAt == null)
                .Where(c => c.Event.Status == "Completed" || c.Event.Status == "Cancelled")
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.EventId,
                    eventTitle = c.Event.Title,
                    eventStatus = c.Event.Status,
                    c.TargetAmount,
                    confirmedAmount = c.Donations.Where(d => d.Status == "Confirmed").Sum(d => (decimal?)d.Amount) ?? 0,
                    c.EndDate,
                    c.Status,
                    organizerId = c.Event.OrganizerId
                })
                .Where(x => x.confirmedAmount > 0)
                .OrderBy(x => x.EndDate)
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("export/finance")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> ExportFinance([FromQuery] string format = "json", [FromQuery] int maxRows = 5000)
        {
            maxRows = Math.Clamp(maxRows, 1, 10000);
            var campaigns = await _unitOfWork.SupportCampaigns.GetQueryable()
                .Include(c => c.Event)
                .Select(c => new
                {
                    Type = "Campaign",
                    c.Id,
                    Event = c.Event.Title,
                    c.Title,
                    Counterparty = "",
                    c.Status,
                    Amount = c.Donations.Where(d => d.Status == "Confirmed").Sum(d => (decimal?)d.Amount) ?? 0,
                    c.UsedAmount,
                    c.ReportSummary,
                    c.ReportedAt,
                    c.CreatedAt
                })
                .ToListAsync();
            var proposals = await _unitOfWork.SponsorshipProposals.GetQueryable()
                .Include(p => p.Event)
                .Include(p => p.Sponsor)
                .Select(p => new
                {
                    Type = "Sponsorship",
                    p.Id,
                    Event = p.Event.Title,
                    p.Title,
                    Counterparty = p.Sponsor.Name,
                    p.Status,
                    Amount = p.ActualReceivedAmount ?? (p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0),
                    p.UsedAmount,
                    p.ReportSummary,
                    p.ReportedAt,
                    p.CreatedAt
                })
                .ToListAsync();
            var rows = campaigns.Concat(proposals).OrderByDescending(x => x.CreatedAt).ToList();
            if (rows.Count > maxRows)
                return BadRequest(new { message = $"Export has {rows.Count} rows. Refine filters or raise maxRows up to 10000.", totalRows = rows.Count, maxRows });
            rows = rows.Take(maxRows).ToList();

            if (format.ToLower() == "csv")
            {
                await RecordAuditAsync("Admin.Export.Finance", "Finance", null, "Format=csv");
                var csv = new StringBuilder();
                csv.AppendLine("Type,Id,Event,Title,Counterparty,Status,Amount,UsedAmount,ReportSummary,ReportedAt,CreatedAt");
                foreach (var row in rows)
                    csv.AppendLine($"{row.Type},{row.Id},{EscapeCsv(row.Event)},{EscapeCsv(row.Title)},{EscapeCsv(row.Counterparty)},{row.Status},{row.Amount},{row.UsedAmount},{EscapeCsv(row.ReportSummary)},{row.ReportedAt:yyyy-MM-dd},{row.CreatedAt:yyyy-MM-dd}");
                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "finance.csv");
            }

            await RecordAuditAsync("Admin.Export.Finance", "Finance", null, "Format=json");
            return Ok(rows);
        }

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

        private static string? ValidateAdminCreateUser(AdminCreateUserDto dto)
        {
            if (dto.UserType is < 0 or > 2)
                return "Admin-created users can only be Volunteer, Organizer, or Sponsor";
            if (string.IsNullOrWhiteSpace(dto.UserName) || dto.UserName.Trim().Length is < 3 or > 50)
                return "Username must be between 3 and 50 characters";
            if (!Regex.IsMatch(dto.UserName.Trim(), "^[a-zA-Z0-9_-]+$"))
                return "Username can only contain letters, numbers, underscores, and hyphens";
            if (string.IsNullOrWhiteSpace(dto.Email) || !Regex.IsMatch(dto.Email.Trim(), "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
                return "Valid email is required";
            if (!string.IsNullOrWhiteSpace(dto.Phone) && !Regex.IsMatch(dto.Phone.Trim(), "^\\+?[0-9\\s.-]{8,20}$"))
                return "Phone format is invalid";
            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 8)
                return "Password must be at least 8 characters";
            if (!Regex.IsMatch(dto.Password, "[A-Za-z]") || !Regex.IsMatch(dto.Password, "[0-9]"))
                return "Password must contain at least one letter and one number";
            return null;
        }
    }

    public class AdminReviewDto
    {
        public string? Note { get; set; }
    }

    public class AdminCreateUserDto
    {
        public string UserName { get; set; } = "";
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string Password { get; set; } = "";
        public int UserType { get; set; }
        public bool? IsActive { get; set; }
    }
}






