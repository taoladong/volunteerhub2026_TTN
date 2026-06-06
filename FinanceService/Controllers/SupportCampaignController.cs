using System.Security.Claims;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services.VolunteerHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class SupportCampaignController : ControllerBase
    {
        private static readonly string[] PublicCampaignStatuses = ["Open", "Closed", "Reported"];
        private readonly MySqlDbContext _context;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;
        private readonly IBadgeService _badgeService;

        public SupportCampaignController(
            MySqlDbContext context,
            IAuditLogService auditLogService,
            INotificationService notificationService,
            IBadgeService badgeService)
        {
            _context = context;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
            _badgeService = badgeService;
        }

        [HttpGet("api/events/{eventId}/support-campaigns")]
        public async Task<IActionResult> GetByEvent(int eventId)
        {
            var ev = await _context.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null) return NotFound(new { message = "Event not found" });

            var canManage = CanManageEvent(ev, GetUserIdOrNull());
            var query = _context.SupportCampaigns
                .AsNoTracking()
                .Where(c => c.EventId == eventId);

            if (!canManage)
            {
                query = query.Where(c =>
                    PublicCampaignStatuses.Contains(c.Status) &&
                    (ev.Status == "Approved" || ev.Status == "Completed"));
            }

            var campaigns = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.EventId,
                    c.Title,
                    c.Description,
                    c.TargetAmount,
                    c.MinimumAmount,
                    c.StartDate,
                    c.EndDate,
                    c.ReceiveInfo,
                    c.BankBin,
                    c.BankAccountNo,
                    c.BankAccountName,
                    c.TransparencyNote,
                    c.Status,
                    c.CreatedAt,
                    c.UpdatedAt,
                    c.UsedAmount,
                    c.ReportSummary,
                    c.ExpenseDetails,
                    c.ReportAttachmentUrl,
                    c.ReportedAt,
                    confirmedAmount = c.Donations.Where(d => d.Status == "Confirmed").Sum(d => (decimal?)d.Amount) ?? 0,
                    pendingAmount = canManage ? c.Donations.Where(d => d.Status == "PendingConfirmation").Sum(d => (decimal?)d.Amount) ?? 0 : 0,
                    confirmedCount = c.Donations.Count(d => d.Status == "Confirmed"),
                    pendingCount = canManage ? c.Donations.Count(d => d.Status == "PendingConfirmation") : 0,
                    publicDonors = c.Donations
                        .Where(d => d.Status == "Confirmed")
                        .OrderByDescending(d => d.ConfirmedAt ?? d.CreatedAt)
                        .Take(10)
                        .Select(d => new
                        {
                            d.Id,
                            d.Amount,
                            displayName = d.IsAnonymous ? "Ẩn danh" : d.DisplayName,
                            d.IsAnonymous,
                            d.Note,
                            d.CreatedAt,
                            d.ConfirmedAt
                        })
                })
                .ToListAsync();

            return Ok(campaigns);
        }

        [HttpGet("api/support-campaigns/{campaignId}")]
        public async Task<IActionResult> GetById(int campaignId)
        {
            var campaign = await _context.SupportCampaigns
                .AsNoTracking()
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return NotFound(new { message = "Campaign not found" });

            var canManage = CanManageEvent(campaign.Event, GetUserIdOrNull());
            if (!canManage && (!PublicCampaignStatuses.Contains(campaign.Status) || campaign.Event.Status is not ("Approved" or "Completed")))
                return NotFound(new { message = "Campaign not found" });

            var summary = await BuildCampaignSummary(campaign.Id);
            return Ok(new
            {
                campaign.Id,
                campaign.EventId,
                campaign.Title,
                campaign.Description,
                campaign.TargetAmount,
                campaign.MinimumAmount,
                campaign.StartDate,
                campaign.EndDate,
                campaign.ReceiveInfo,
                campaign.BankBin,
                campaign.BankAccountNo,
                campaign.BankAccountName,
                campaign.TransparencyNote,
                campaign.Status,
                campaign.CreatedAt,
                campaign.UpdatedAt,
                campaign.UsedAmount,
                campaign.ReportSummary,
                campaign.ExpenseDetails,
                campaign.ReportAttachmentUrl,
                campaign.ReportedAt,
                summary
            });
        }

        [HttpPost("api/events/{eventId}/support-campaigns"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Create(int eventId, [FromBody] SupportCampaignDto dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (!CanManageEvent(ev, userId)) return Forbid();
            if (ev.Status != "Approved")
                return BadRequest(new { message = "Only approved active events can create support campaigns" });
            if (NormalizeToUtc(ev.EndDate) < DateTime.UtcNow)
                return BadRequest(new { message = "Cannot create support campaign after event end date" });

            var validation = ValidateCampaign(dto, requireReceiveInfo: false);
            if (validation != null) return BadRequest(new { message = validation });

            var campaign = new SupportCampaign
            {
                EventId = eventId,
                Title = dto.Title.Trim(),
                Description = dto.Description.Trim(),
                TargetAmount = dto.TargetAmount,
                MinimumAmount = dto.MinimumAmount,
                StartDate = NormalizeToUtc(dto.StartDate),
                EndDate = NormalizeToUtc(dto.EndDate),
                ReceiveInfo = dto.ReceiveInfo?.Trim() ?? "",
                BankBin = dto.BankBin?.Trim() ?? "",
                BankAccountNo = dto.BankAccountNo?.Trim() ?? "",
                BankAccountName = dto.BankAccountName?.Trim() ?? "",
                TransparencyNote = dto.TransparencyNote?.Trim() ?? "",
                Status = NormalizeCampaignStatus(dto.Status, fallback: "Draft"),
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            if (campaign.Status == "Open")
            {
                var openValidation = CanOpenCampaign(ev, campaign);
                if (openValidation != null) return BadRequest(new { message = openValidation });
            }

            _context.SupportCampaigns.Add(campaign);
            await _context.SaveChangesAsync();
            await RecordAuditAsync(userId, "SupportCampaign.Create", "SupportCampaign", campaign.Id, $"EventId={eventId};Status={campaign.Status};Target={campaign.TargetAmount:0.##}");

            return Ok(campaign);
        }

        [HttpPut("api/support-campaigns/{campaignId}"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Update(int campaignId, [FromBody] SupportCampaignDto dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var campaign = await _context.SupportCampaigns.Include(c => c.Event).FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return NotFound(new { message = "Campaign not found" });
            if (!CanManageEvent(campaign.Event, userId)) return Forbid();
            if (campaign.Status == "Cancelled" || campaign.Status == "Reported")
                return BadRequest(new { message = "Cannot edit cancelled or reported campaign" });
            if (campaign.Event.Status != "Approved")
                return BadRequest(new { message = "Only approved active events can edit support campaigns" });
            if (NormalizeToUtc(campaign.Event.EndDate) < DateTime.UtcNow)
                return BadRequest(new { message = "Cannot edit support campaign after event end date" });

            var validation = ValidateCampaign(dto, requireReceiveInfo: campaign.Status == "Open");
            if (validation != null) return BadRequest(new { message = validation });

            campaign.Title = dto.Title.Trim();
            campaign.Description = dto.Description.Trim();
            campaign.TargetAmount = dto.TargetAmount;
            campaign.MinimumAmount = dto.MinimumAmount;
            campaign.StartDate = NormalizeToUtc(dto.StartDate);
            campaign.EndDate = NormalizeToUtc(dto.EndDate);
            campaign.ReceiveInfo = dto.ReceiveInfo?.Trim() ?? "";
            campaign.BankBin = dto.BankBin?.Trim() ?? "";
            campaign.BankAccountNo = dto.BankAccountNo?.Trim() ?? "";
            campaign.BankAccountName = dto.BankAccountName?.Trim() ?? "";
            campaign.TransparencyNote = dto.TransparencyNote?.Trim() ?? "";
            campaign.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await RecordAuditAsync(userId, "SupportCampaign.Update", "SupportCampaign", campaign.Id, $"Status={campaign.Status};Target={campaign.TargetAmount:0.##}");

            return Ok(campaign);
        }

        [HttpPut("api/support-campaigns/{campaignId}/open"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public Task<IActionResult> Open(int campaignId) => ChangeCampaignStatus(campaignId, "Open");

        [HttpPut("api/support-campaigns/{campaignId}/close"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public Task<IActionResult> Close(int campaignId) => ChangeCampaignStatus(campaignId, "Closed");

        [HttpPut("api/support-campaigns/{campaignId}/cancel"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public Task<IActionResult> CancelCampaign(int campaignId) => ChangeCampaignStatus(campaignId, "Cancelled");

        [HttpPost("api/support-campaigns/{campaignId}/report"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ReportCampaign(int campaignId, [FromBody] FinancialReportDto dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var campaign = await _context.SupportCampaigns
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return NotFound(new { message = "Campaign not found" });
            if (!CanManageEvent(campaign.Event, userId)) return Forbid();
            if (campaign.Status != "Closed") return BadRequest(new { message = "Only closed campaigns can be reported" });

            var validation = ValidateReport(dto);
            if (validation != null) return BadRequest(new { message = validation });

            var confirmedAmount = await _context.IndividualDonations
                .Where(d => d.CampaignId == campaignId && d.Status == "Confirmed")
                .SumAsync(d => (decimal?)d.Amount) ?? 0;
            if (dto.UsedAmount > confirmedAmount && !dto.AllowOverspend)
                return BadRequest(new { message = $"Used amount ({dto.UsedAmount:0.##}) exceeds confirmed donations ({confirmedAmount:0.##}). Set allowOverspend=true only if organizer contributed extra funds out-of-band." });

            campaign.UsedAmount = dto.UsedAmount;
            campaign.ReportSummary = dto.Summary.Trim();
            campaign.ExpenseDetails = dto.ExpenseDetails?.Trim() ?? "";
            campaign.ReportAttachmentUrl = dto.AttachmentUrl?.Trim() ?? "";
            campaign.ReportedAt = DateTime.UtcNow;
            campaign.ReportedBy = userId;
            campaign.Status = "Reported";
            campaign.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await RecordAuditAsync(userId, "SupportCampaign.Report", "SupportCampaign", campaign.Id, $"UsedAmount={campaign.UsedAmount:0.##}");

            return Ok(campaign);
        }

        [HttpGet("api/support-campaigns/{campaignId}/donations"), Authorize(Roles = "Organizer,Admin")]
        public async Task<IActionResult> GetCampaignDonations(
            int campaignId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var campaign = await _context.SupportCampaigns
                .AsNoTracking()
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return NotFound(new { message = "Campaign not found" });
            if (!CanManageEvent(campaign.Event, userId)) return Forbid();

            var query = _context.IndividualDonations
                .AsNoTracking()
                .Include(d => d.User)
                .Where(d => d.CampaignId == campaignId)
                .OrderByDescending(d => d.CreatedAt);

            var totalCount = await query.CountAsync();
            var donations = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(d => new
                {
                    d.Id,
                    d.CampaignId,
                    d.UserId,
                    userName = d.User.Name ?? d.User.UserName,
                    d.Amount,
                    d.DisplayName,
                    d.Phone,
                    d.Email,
                    d.Note,
                    d.IsAnonymous,
                    d.ProofImageUrl,
                    d.Status,
                    d.ConfirmedBy,
                    d.ConfirmedAt,
                    d.RejectedReason,
                    d.CreatedAt,
                    d.UpdatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                items = donations,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpPost("api/support-campaigns/{campaignId}/donations"), Authorize(Roles = "Volunteer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Donate(int campaignId, [FromBody] IndividualDonationDto dto)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var campaign = await _context.SupportCampaigns
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return NotFound(new { message = "Campaign not found" });
            if (campaign.Status != "Open") return BadRequest(new { message = "Campaign is not open" });
            if (campaign.Event.Status != "Approved") return BadRequest(new { message = "Only approved events can receive donations" });
            var nowUtc = DateTime.UtcNow;
            if (nowUtc < NormalizeToUtc(campaign.StartDate) || nowUtc > NormalizeToUtc(campaign.EndDate))
                return BadRequest(new { message = "Campaign is outside its donation window" });

            var validation = ValidateDonation(dto);
            if (validation != null) return BadRequest(new { message = validation });
            var maxDonationAmount = campaign.TargetAmount > 0
                ? Math.Min(1_000_000_000m, campaign.TargetAmount * 10m)
                : 1_000_000_000m;
            if (dto.Amount > maxDonationAmount)
                return BadRequest(new { message = $"Donation amount must not exceed {maxDonationAmount:0.##}" });
            if (campaign.MinimumAmount.HasValue && dto.Amount < campaign.MinimumAmount.Value)
                return BadRequest(new { message = "Donation amount must be at least the campaign minimum amount" });

            var donation = new IndividualDonation
            {
                CampaignId = campaignId,
                UserId = userId,
                Amount = dto.Amount,
                DisplayName = dto.IsAnonymous ? "" : dto.DisplayName.Trim(),
                Phone = dto.IsAnonymous ? "" : (dto.Phone?.Trim() ?? ""),
                Email = dto.IsAnonymous ? "" : (dto.Email?.Trim() ?? ""),
                Note = dto.Note?.Trim() ?? "",
                IsAnonymous = dto.IsAnonymous,
                ProofImageUrl = dto.ProofImageUrl?.Trim() ?? "",
                Status = "PendingConfirmation",
                CreatedAt = DateTime.UtcNow
            };

            _context.IndividualDonations.Add(donation);
            await _context.SaveChangesAsync();
            await RecordAuditAsync(userId, "IndividualDonation.Create", "IndividualDonation", donation.Id, $"CampaignId={campaignId};Amount={donation.Amount:0.##}");

            // Báo cho người tạo đợt biết có khoản ủng hộ mới đang chờ xác nhận
            try
            {
                await _notificationService.SendAsync(campaign.CreatedBy,
                    "Có khoản ủng hộ mới chờ xác nhận",
                    $"Một khoản ủng hộ {donation.Amount:0.##}đ cho đợt '{campaign.Title}' đang chờ bạn đối chiếu và xác nhận.",
                    "DonationPending", campaign.EventId);
            }
            catch { }

            return Ok(donation);
        }

        [HttpGet("api/donations/my"), Authorize]
        public async Task<IActionResult> GetMyDonations()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var donations = await _context.IndividualDonations
                .AsNoTracking()
                .Include(d => d.Campaign).ThenInclude(c => c.Event)
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new
                {
                    d.Id,
                    d.CampaignId,
                    campaignTitle = d.Campaign.Title,
                    eventId = d.Campaign.EventId,
                    eventTitle = d.Campaign.Event.Title,
                    d.Amount,
                    d.DisplayName,
                    d.IsAnonymous,
                    d.Note,
                    d.Status,
                    d.RejectedReason,
                    d.CreatedAt,
                    d.ConfirmedAt
                })
                .ToListAsync();

            return Ok(donations);
        }

        [HttpPut("api/donations/{donationId}/confirm"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public Task<IActionResult> ConfirmDonation(int donationId) => ChangeDonationStatus(donationId, "Confirmed", null);

        [HttpPut("api/donations/{donationId}/reject"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public Task<IActionResult> RejectDonation(int donationId, [FromBody] DonationStatusDto dto) => ChangeDonationStatus(donationId, "Rejected", dto?.Reason);

        [HttpPut("api/donations/{donationId}/cancel"), Authorize(Roles = "Volunteer,Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CancelDonation(int donationId)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var donation = await _context.IndividualDonations
                .Include(d => d.Campaign).ThenInclude(c => c.Event)
                .FirstOrDefaultAsync(d => d.Id == donationId);
            if (donation == null) return NotFound(new { message = "Donation not found" });
            if (donation.Status != "PendingConfirmation")
                return BadRequest(new { message = "Only pending donations can be cancelled" });

            var canManage = CanManageEvent(donation.Campaign.Event, userId);
            if (!canManage && donation.UserId != userId) return Forbid();

            donation.Status = "Cancelled";
            donation.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await RecordAuditAsync(userId, "IndividualDonation.Cancel", "IndividualDonation", donation.Id, $"CampaignId={donation.CampaignId}");
            await NotifyDonationCancelledAsync(donation, userId, canManage);

            return Ok(donation);
        }

        private async Task<IActionResult> ChangeCampaignStatus(int campaignId, string status)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var campaign = await _context.SupportCampaigns.Include(c => c.Event).FirstOrDefaultAsync(c => c.Id == campaignId);
            if (campaign == null) return NotFound(new { message = "Campaign not found" });
            if (!CanManageEvent(campaign.Event, userId)) return Forbid();

            var transitionValidation = ValidateCampaignTransition(campaign, status);
            if (transitionValidation != null) return BadRequest(new { message = transitionValidation });

            if (status == "Open")
            {
                var validation = CanOpenCampaign(campaign.Event, campaign);
                if (validation != null) return BadRequest(new { message = validation });
            }

            campaign.Status = status;
            campaign.UpdatedAt = DateTime.UtcNow;
            var pendingDonations = new List<IndividualDonation>();
            if (status == "Cancelled")
            {
                pendingDonations = await _context.IndividualDonations
                    .Where(d => d.CampaignId == campaign.Id && d.Status == "PendingConfirmation")
                    .ToListAsync();
                foreach (var donation in pendingDonations)
                {
                    donation.Status = "Cancelled";
                    donation.RejectedReason = "Campaign cancelled";
                    donation.UpdatedAt = DateTime.UtcNow;
                }
            }
            await _context.SaveChangesAsync();
            await RecordAuditAsync(userId, $"SupportCampaign.{status}", "SupportCampaign", campaign.Id, $"EventId={campaign.EventId}");
            if (status == "Cancelled")
            {
                await NotifyConfirmedDonorsCampaignClosedAsync(campaign.Id, campaign.EventId, campaign.Title, campaign.Event.Title, "Đợt kêu gọi đã bị hủy");
                foreach (var donation in pendingDonations)
                {
                    await _notificationService.SendAsync(
                        donation.UserId,
                        "Khoản ủng hộ chờ xác nhận đã bị hủy",
                        $"Đợt kêu gọi '{campaign.Title}' đã bị hủy nên khoản ủng hộ chờ xác nhận của bạn đã được hủy tự động.",
                        "DonationCancelled",
                        campaign.Id);
                }
            }

            return Ok(campaign);
        }

        private async Task<IActionResult> ChangeDonationStatus(int donationId, string status, string? reason)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();
            if (!await IsUserActiveAsync(userId)) return Forbid();

            var donation = await _context.IndividualDonations
                .Include(d => d.Campaign).ThenInclude(c => c.Event)
                .FirstOrDefaultAsync(d => d.Id == donationId);
            if (donation == null) return NotFound(new { message = "Donation not found" });
            if (!CanManageEvent(donation.Campaign.Event, userId)) return Forbid();
            if (donation.Status != "PendingConfirmation")
                return BadRequest(new { message = "Only pending donations can be updated" });
            if (donation.Campaign.Status != "Open")
                return BadRequest(new { message = "Only donations in open campaigns can be updated" });
            if (donation.Campaign.Event.Status != "Approved")
                return BadRequest(new { message = "Only donations for approved events can be updated" });

            donation.Status = status;
            donation.UpdatedAt = DateTime.UtcNow;
            if (status == "Confirmed")
            {
                donation.ConfirmedBy = userId;
                donation.ConfirmedAt = DateTime.UtcNow;
                donation.RejectedReason = "";
            }
            else if (status == "Rejected")
            {
                donation.RejectedReason = reason?.Trim() ?? "";
            }

            await _context.SaveChangesAsync();

            if (status == "Confirmed")
            {
                // Ghi nhận đóng góp vào hồ sơ người ủng hộ + xét huy hiệu
                var profile = await _context.VolunteerProfiles.FirstOrDefaultAsync(p => p.UserId == donation.UserId);
                if (profile != null)
                {
                    var agg = await _context.IndividualDonations
                        .Where(d => d.UserId == donation.UserId && d.Status == "Confirmed")
                        .GroupBy(d => 1)
                        .Select(g => new { Sum = g.Sum(x => (decimal?)x.Amount) ?? 0, Cnt = g.Count() })
                        .FirstOrDefaultAsync();
                    profile.TotalDonatedAmount = agg?.Sum ?? 0;
                    profile.DonationCount = agg?.Cnt ?? 0;
                    await _context.SaveChangesAsync();
                    try { await _badgeService.CheckAndAwardAsync(donation.UserId); } catch { }
                }
            }

            await RecordAuditAsync(userId, $"IndividualDonation.{status}", "IndividualDonation", donation.Id, $"CampaignId={donation.CampaignId};Amount={donation.Amount:0.##}");
            await NotifyDonationStatusChangedAsync(donation, status);

            return Ok(donation);
        }

        private async Task<object> BuildCampaignSummary(int campaignId)
        {
            var donations = await _context.IndividualDonations
                .AsNoTracking()
                .Where(d => d.CampaignId == campaignId)
                .GroupBy(d => 1)
                .Select(g => new
                {
                    confirmedAmount = g.Where(d => d.Status == "Confirmed").Sum(d => (decimal?)d.Amount) ?? 0,
                    pendingAmount = g.Where(d => d.Status == "PendingConfirmation").Sum(d => (decimal?)d.Amount) ?? 0,
                    confirmedCount = g.Count(d => d.Status == "Confirmed"),
                    pendingCount = g.Count(d => d.Status == "PendingConfirmation")
                })
                .FirstOrDefaultAsync();

            return donations ?? new { confirmedAmount = 0m, pendingAmount = 0m, confirmedCount = 0, pendingCount = 0 };
        }

        private bool CanManageEvent(Entities.Event ev, int? userId)
        {
            if (userId == null) return false;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            return role == "Admin" || ev.OrganizerId == userId.Value;
        }

        private int? GetUserIdOrNull()
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId) ? userId : null;
        }

        private bool TryGetUserId(out int userId)
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out userId);
        }

        private async Task<bool> IsUserActiveAsync(int userId)
        {
            return await _context.Users.AnyAsync(u => u.Id == userId && u.IsActive);
        }

        private static string NormalizeCampaignStatus(string? status, string fallback)
        {
            return status?.Trim() switch
            {
                "Open" => "Open",
                "Closed" => "Closed",
                "Cancelled" => "Cancelled",
                "Reported" => "Reported",
                _ => fallback
            };
        }

        private static string? ValidateCampaign(SupportCampaignDto dto, bool requireReceiveInfo)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length < 3 || dto.Title.Trim().Length > 200)
                return "Campaign title must be 3-200 characters";
            if (string.IsNullOrWhiteSpace(dto.Description) || dto.Description.Trim().Length < 10 || dto.Description.Trim().Length > 2000)
                return "Campaign description must be 10-2000 characters";
            if (dto.TargetAmount <= 0)
                return "Target amount must be greater than zero";
            if (dto.MinimumAmount.HasValue && (dto.MinimumAmount < 0 || dto.MinimumAmount > dto.TargetAmount))
                return "Minimum amount must be between zero and target amount";
            if (NormalizeToUtc(dto.EndDate) <= NormalizeToUtc(dto.StartDate))
                return "End date must be after start date";
            if (requireReceiveInfo && string.IsNullOrWhiteSpace(dto.ReceiveInfo))
                return "Receive info is required to open a campaign";
            if ((dto.ReceiveInfo?.Length ?? 0) > 1000 || (dto.TransparencyNote?.Length ?? 0) > 1000)
                return "Receive info and transparency note must be at most 1000 characters";
            return null;
        }

        private static string? CanOpenCampaign(Entities.Event ev, SupportCampaign campaign)
        {
            if (ev.Status != "Approved")
                return "Only approved events can open support campaigns";
            if (NormalizeToUtc(ev.EndDate) < DateTime.UtcNow)
                return "Cannot open support campaign after event end date";
            if (string.IsNullOrWhiteSpace(campaign.ReceiveInfo))
                return "Receive info is required to open a campaign";
            if (campaign.TargetAmount <= 0)
                return "Target amount must be greater than zero";
            if (NormalizeToUtc(campaign.EndDate) <= NormalizeToUtc(campaign.StartDate))
                return "End date must be after start date";
            return null;
        }

        private static string? ValidateCampaignTransition(SupportCampaign campaign, string nextStatus)
        {
            return nextStatus switch
            {
                "Open" when campaign.Status != "Draft" => "Only draft campaigns can be opened",
                "Closed" when campaign.Status != "Open" => "Only open campaigns can be closed",
                "Cancelled" when campaign.Status is "Reported" or "Cancelled" => "Reported or already cancelled campaigns cannot be cancelled",
                _ => null
            };
        }

        private async Task NotifyDonationStatusChangedAsync(IndividualDonation donation, string status)
        {
            var title = status == "Confirmed" ? "Khoản ủng hộ đã được xác nhận" : "Khoản ủng hộ bị từ chối";
            var message = status == "Confirmed"
                ? $"Khoản ủng hộ {donation.Amount:0.##}đ cho đợt '{donation.Campaign.Title}' đã được xác nhận."
                : $"Khoản ủng hộ {donation.Amount:0.##}đ cho đợt '{donation.Campaign.Title}' bị từ chối.";
            if (status == "Rejected" && !string.IsNullOrWhiteSpace(donation.RejectedReason))
                message += $" Lý do: {donation.RejectedReason}";

            await _notificationService.SendAsync(donation.UserId, title, message, $"Donation{status}", donation.CampaignId);
        }

        private async Task NotifyDonationCancelledAsync(IndividualDonation donation, int actorUserId, bool actorCanManage)
        {
            if (actorCanManage && donation.UserId != actorUserId)
            {
                await _notificationService.SendAsync(
                    donation.UserId,
                    "Khoản ủng hộ đã bị hủy",
                    $"Khoản ủng hộ {donation.Amount:0.##}đ cho đợt '{donation.Campaign.Title}' đã bị ban tổ chức hủy.",
                    "DonationCancelled",
                    donation.CampaignId);
                return;
            }

            var organizerId = donation.Campaign.Event.OrganizerId;
            if (organizerId != actorUserId)
            {
                await _notificationService.SendAsync(
                    organizerId,
                    "Volunteer đã hủy khoản ủng hộ",
                    $"Một khoản ủng hộ {donation.Amount:0.##}đ cho đợt '{donation.Campaign.Title}' đã bị người ủng hộ hủy.",
                    "DonationCancelled",
                    donation.CampaignId);
            }
        }

        private async Task NotifyConfirmedDonorsCampaignClosedAsync(int campaignId, int eventId, string campaignTitle, string eventTitle, string title)
        {
            var donorIds = await _context.IndividualDonations
                .AsNoTracking()
                .Where(d => d.CampaignId == campaignId && d.Status == "Confirmed")
                .Select(d => d.UserId)
                .Distinct()
                .ToListAsync();

            var message = $"Đợt kêu gọi '{campaignTitle}' của sự kiện '{eventTitle}' đã đóng/hủy. Vui lòng theo dõi báo cáo hoặc liên hệ ban tổ chức để biết phương án xử lý khoản ủng hộ.";
            foreach (var donorId in donorIds)
            {
                await _notificationService.SendAsync(donorId, title, message, "CampaignClosed", eventId);
            }
        }

        private static DateTime NormalizeToUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => value
            };
        }

        private static string? ValidateDonation(IndividualDonationDto dto)
        {
            if (dto.Amount <= 0)
                return "Donation amount must be greater than zero";
            if (!dto.IsAnonymous && string.IsNullOrWhiteSpace(dto.DisplayName))
                return "Display name is required when donation is public";
            if ((dto.DisplayName?.Length ?? 0) > 120 || (dto.Phone?.Length ?? 0) > 30 || (dto.Email?.Length ?? 0) > 120)
                return "Donation contact fields are too long";
            if ((dto.Note?.Length ?? 0) > 500 || (dto.ProofImageUrl?.Length ?? 0) > 500)
                return "Donation note or proof URL is too long";
            if (!string.IsNullOrWhiteSpace(dto.ProofImageUrl) && !IsInternalUploadUrl(dto.ProofImageUrl))
                return "Proof image must be uploaded through the system";
            return null;
        }

        private static bool IsInternalUploadUrl(string value)
        {
            var trimmed = value.Trim();
            if (trimmed.Length > 500 || trimmed.Contains('\\')) return false;
            if (System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"^[a-zA-Z][a-zA-Z0-9+.-]*:")) return false;
            return trimmed.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
                   trimmed.StartsWith("/api/uploads/", StringComparison.OrdinalIgnoreCase);
        }

        private static string? ValidateReport(FinancialReportDto dto)
        {
            if (dto.UsedAmount < 0)
                return "Used amount must be zero or greater";
            if (string.IsNullOrWhiteSpace(dto.Summary) || dto.Summary.Trim().Length > 2000)
                return "Report summary is required and must be at most 2000 characters";
            if ((dto.ExpenseDetails?.Length ?? 0) > 4000 || (dto.AttachmentUrl?.Length ?? 0) > 500)
                return "Report details or attachment URL is too long";
            return null;
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

    public class SupportCampaignDto
    {
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal TargetAmount { get; set; }
        public decimal? MinimumAmount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? ReceiveInfo { get; set; }
        public string? BankBin { get; set; }
        public string? BankAccountNo { get; set; }
        public string? BankAccountName { get; set; }
        public string? TransparencyNote { get; set; }
        public string? Status { get; set; }
    }

    public class IndividualDonationDto
    {
        public decimal Amount { get; set; }
        public string DisplayName { get; set; } = "";
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Note { get; set; }
        public bool IsAnonymous { get; set; }
        public string? ProofImageUrl { get; set; }
    }

    public class DonationStatusDto
    {
        public string? Reason { get; set; }
    }

    public class FinancialReportDto
    {
        public decimal UsedAmount { get; set; }
        public string Summary { get; set; } = "";
        public string? ExpenseDetails { get; set; }
        public string? AttachmentUrl { get; set; }
        public bool AllowOverspend { get; set; }
    }
}
