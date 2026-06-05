using BaseCore.Repository;
using BaseCore.Services.VolunteerHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;

namespace BaseCore.APIService.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminFinanceController : ControllerBase
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;
        private readonly IAuditLogService _auditLogService;

        public AdminFinanceController(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork, IAuditLogService auditLogService)
        {
            _unitOfWork = unitOfWork;
            _auditLogService = auditLogService;
        }

        [HttpGet("finance/overview-detail")]
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
                    .Include(d => d.Campaign).ThenInclude(c => c.Event)
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

        [HttpGet("export/finance-detail")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> ExportFinance([FromQuery] string format = "json")
        {
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

            if (format.ToLower() == "csv")
            {
                await RecordAuditAsync("Admin.Export.Finance", "Finance", null, "Format=csv");
                var csv = new StringBuilder();
                csv.AppendLine("Type,Id,Event,Title,Counterparty,Status,Amount,UsedAmount,ReportSummary,ReportedAt,CreatedAt");
                foreach (var row in rows)
                {
                    csv.AppendLine($"{row.Type},{row.Id},{EscapeCsv(row.Event)},{EscapeCsv(row.Title)},{EscapeCsv(row.Counterparty)},{row.Status},{row.Amount},{row.UsedAmount},{EscapeCsv(row.ReportSummary)},{row.ReportedAt:yyyy-MM-dd},{row.CreatedAt:yyyy-MM-dd}");
                }

                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "finance.csv");
            }

            await RecordAuditAsync("Admin.Export.Finance", "Finance", null, "Format=json");
            return Ok(rows);
        }

        private Task RecordAuditAsync(string action, string entityType, int? entityId = null, string? metadata = null)
        {
            var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsed) ? parsed : (int?)null;
            return _auditLogService.RecordAsync(
                userId,
                action,
                entityType,
                entityId,
                metadata,
                HttpContext.Connection.RemoteIpAddress?.ToString());
        }

        private static string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            var trimmed = value.TrimStart();
            if (trimmed.Length > 0 && "=+-@".Contains(trimmed[0]))
                value = "'" + value;
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            {
                return $"\"{value.Replace("\"", "\"\"")}\"";
            }

            return value;
        }
    }
}






