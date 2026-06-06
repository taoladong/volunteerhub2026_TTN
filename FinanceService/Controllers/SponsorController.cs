using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Services.VolunteerHub;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class SponsorController : ControllerBase
    {
        private readonly IEventSponsorRepositoryEF _sponsorRepo;
        private readonly MySqlDbContext _context;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;

        public SponsorController(
            IEventSponsorRepositoryEF sponsorRepo,
            MySqlDbContext context,
            IAuditLogService auditLogService,
            INotificationService notificationService)
        {
            _sponsorRepo = sponsorRepo;
            _context = context;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
        }

        [HttpGet("api/events/{eventId}/sponsors")]
        public async Task<IActionResult> GetSponsors(int eventId)
        {
            var sponsors = await _sponsorRepo.GetByEventAsync(eventId);
            return Ok(sponsors);
        }

        [HttpPost("api/events/{eventId}/sponsors"), Authorize(Roles = "Sponsor")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> AddSponsor(int eventId, [FromBody] SponsorDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null) return NotFound(new { message = "Event not found" });

            if (ev.EndDate <= DateTime.UtcNow)
                return BadRequest(new { message = "Cannot sponsor an event that has already ended" });

            await RecordAuditAsync(userId, "Sponsor.Add.BlockedLegacy", "EventSponsor", null, $"EventId={eventId}");

            Response.Headers["X-Deprecated"] = "Use /api/events/{eventId}/sponsorship-proposals/sponsor-offer instead";

            return BadRequest(new
            {
                message = "Direct sponsorship is disabled. Please use the sponsorship proposal workflow so organizer and sponsor can approve and record actual received amount.",
                warning = "This endpoint is deprecated. Use /api/events/{eventId}/sponsorship-proposals/sponsor-offer instead."
            });
        }

        [HttpGet("api/sponsors/my"), Authorize(Roles = "Sponsor")]
        public async Task<IActionResult> GetMySponsorships()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var sponsors = await _sponsorRepo.GetBySponsorAsync(userId);
            return Ok(sponsors);
        }

        [HttpGet("api/sponsors/my/{sponsorshipId}/tracking"), Authorize(Roles = "Sponsor")]
        public async Task<IActionResult> GetMySponsorshipTracking(int sponsorshipId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var sponsorship = await _context.EventSponsors
                .Include(s => s.Event).ThenInclude(e => e.Category)
                .Include(s => s.Event).ThenInclude(e => e.Organizer)
                .FirstOrDefaultAsync(s => s.Id == sponsorshipId && s.SponsorId == userId);

            if (sponsorship == null)
                return NotFound(new { message = "Sponsorship not found" });

            var ev = sponsorship.Event;
            var eventId = sponsorship.EventId;
            var registrations = await _context.Registrations
                .Where(r => r.EventId == eventId)
                .ToListAsync();
            var certificatesIssued = await _context.Certificates.CountAsync(c => c.EventId == eventId);
            var sponsors = await _context.EventSponsors
                .Where(s => s.EventId == eventId)
                .ToListAsync();
            var campaigns = await _context.SupportCampaigns
                .Include(c => c.Donations)
                .Where(c => c.EventId == eventId)
                .ToListAsync();
            var proposals = await _context.SponsorshipProposals
                .Where(p => p.EventId == eventId)
                .ToListAsync();
            var proposalLegacySponsorIds = proposals
                .Where(p => p.LegacyEventSponsorId != null)
                .Select(p => p.LegacyEventSponsorId!.Value)
                .ToHashSet();
            var standaloneSponsors = sponsors
                .Where(s => !proposalLegacySponsorIds.Contains(s.Id))
                .ToList();

            var projectProgress = CalculateProjectProgress(ev);
            var timeline = BuildTrackingTimeline(ev, sponsorship);
            var confirmedDonationAmount = campaigns
                .SelectMany(c => c.Donations)
                .Where(d => d.Status == "Confirmed")
                .Sum(d => d.Amount);
            var proposalReceivedAmount = proposals
                .Where(p => p.Status == "Received" || p.Status == "Reported")
                .Sum(p => p.ActualReceivedAmount ?? p.OfferedAmount ?? p.RequestedAmount ?? 0);

            return Ok(new
            {
                sponsorship,
                eventInfo = new
                {
                    ev.Id,
                    ev.Title,
                    ev.Status,
                    ev.Location,
                    ev.StartDate,
                    ev.EndDate,
                    category = ev.Category?.Name ?? "",
                    organizer = ev.Organizer?.Name ?? ""
                },
                impact = new
                {
                    totalRegistrations = registrations.Count,
                    confirmedRegistrations = registrations.Count(r => r.Status == "Confirmed"),
                    attendedVolunteers = registrations.Count(r => r.IsAttended),
                    totalVolunteerHours = registrations.Where(r => r.IsAttended).Sum(r => r.VolunteerHours),
                    certificatesIssued,
                    sponsorCount = standaloneSponsors.Count,
                    sponsorAmount = standaloneSponsors.Sum(s => s.Amount),
                    campaignCount = campaigns.Count,
                    confirmedDonationAmount,
                    proposalCount = proposals.Count,
                    proposalReceivedAmount,
                    projectProgress
                },
                timeline,
                projectProgress
            });
        }

        private static int CalculateProjectProgress(Entities.Event ev)
        {
            return ev.Status switch
            {
                "Completed" => 100,
                "Cancelled" => 0,
                "Approved" when DateTime.UtcNow >= ev.EndDate => 90,
                "Approved" when DateTime.UtcNow >= ev.StartDate => 75,
                "Approved" => 50,
                "Pending" => 25,
                _ => 25
            };
        }

        private static List<object> BuildTrackingTimeline(Entities.Event ev, EventSponsor sponsorship)
        {
            var timeline = new List<object>
            {
                new
                {
                    title = "Event created",
                    date = ev.CreatedAt,
                    status = "Done",
                    description = "Organizer submitted the event to VolunteerHub.",
                    progressPercent = 25
                },
                new
                {
                    title = "Sponsorship recorded",
                    date = sponsorship.SponsoredAt,
                    status = "Done",
                    description = $"{sponsorship.ContributionType} - {sponsorship.Amount:0.##} VND",
                    progressPercent = 50
                }
            };

            if (ev.Status is "Approved" or "Completed")
            {
                timeline.Add(new
                {
                    title = "Event approved",
                    date = ev.CreatedAt,
                    status = "Done",
                    description = "Event is public and open for registration.",
                    progressPercent = 60
                });
            }

            timeline.Add(new
            {
                title = "Event delivery",
                date = ev.StartDate,
                status = ev.Status == "Completed" || DateTime.UtcNow >= ev.StartDate ? "Done" : "Pending",
                description = $"{ev.Location} - {ev.StartDate:dd/MM/yyyy HH:mm}",
                progressPercent = ev.Status == "Completed" ? 90 : 75
            });

            if (ev.Status == "Completed")
            {
                timeline.Add(new
                {
                    title = "Completed",
                    date = ev.EndDate,
                    status = "Done",
                    description = "Event completed and impact data is available.",
                    progressPercent = 100
                });
            }

            return timeline;
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

    public class SponsorDto
    {
        public string ContributionType { get; set; } = "Financial";
        public decimal Amount { get; set; }
        public string? Note { get; set; }
    }
}
