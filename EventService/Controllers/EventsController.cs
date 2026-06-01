using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using EventService.Entities;
using EventService.Data;
using EventService.Services;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EventService.Controllers
{
    [Route("api/events")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;
        private readonly IRegistrationService _registrationService;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;
        private readonly EventDbContext _context;

        public EventsController(
            IEventService eventService,
            IRegistrationService registrationService,
            IAuditLogService auditLogService,
            INotificationService notificationService,
            EventDbContext context)
        {
            _eventService = eventService;
            _registrationService = registrationService;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword, [FromQuery] int? categoryId,
            [FromQuery] string? status, [FromQuery] DateTime? startDateFrom,
            [FromQuery] int? skillId, [FromQuery] string? location,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            // Chỉ Admin được phép xem tất cả status (Pending/Rejected/Cancelled).
            // Anon/Volunteer/Organizer/Sponsor: nếu không truyền status → backend force public listing.
            var isAdmin = User?.IsInRole("Admin") == true;
            var (items, totalCount) = await _eventService.SearchAsync(
                keyword, categoryId, status, startDateFrom, page, pageSize, skillId, location,
                publicOnly: !isAdmin);
            return Ok(new { items, totalCount, page, pageSize, totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }

        [HttpGet("my"), Authorize(Roles = "Organizer")]
        public async Task<IActionResult> GetMine()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var events = await _eventService.GetByOrganizerAsync(userId);
            return Ok(events);
        }

        [HttpGet("recommended"), Authorize]
        public async Task<IActionResult> GetRecommended()
        {
            if (!int.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var events = await _eventService.GetRecommendedAsync(userId);
            return Ok(events);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var ev = await _eventService.GetByIdAsync(id);
            return ev == null ? NotFound(new { message = "Event not found" }) : Ok(ev);
        }

        [HttpGet("{id}/impact")]
        public async Task<IActionResult> GetImpact(int id)
        {
            var ev = await _context.Events
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .FirstOrDefaultAsync(e => e.Id == id);
            if (ev == null) return NotFound(new { message = "Event not found" });

            var registrations = await _context.Registrations
                .Where(r => r.EventId == id)
                .ToListAsync();
            var sponsors = await _context.EventSponsors
                .Where(s => s.EventId == id)
                .ToListAsync();
            var proposalLegacySponsorIds = await _context.SponsorshipProposals
                .Where(p => p.EventId == id && p.LegacyEventSponsorId != null)
                .Select(p => p.LegacyEventSponsorId!.Value)
                .ToListAsync();
            var standaloneSponsors = sponsors
                .Where(s => !proposalLegacySponsorIds.Contains(s.Id))
                .ToList();
            var campaigns = await _context.SupportCampaigns
                .Where(c => c.EventId == id)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Status,
                    c.TargetAmount,
                    c.UsedAmount,
                    c.ReportSummary,
                    c.ReportedAt,
                    confirmedAmount = c.Donations.Where(d => d.Status == "Confirmed").Sum(d => (decimal?)d.Amount) ?? 0,
                    confirmedCount = c.Donations.Count(d => d.Status == "Confirmed"),
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
                            d.CreatedAt,
                            d.ConfirmedAt
                        })
                })
                .ToListAsync();
            var sponsorships = await _context.SponsorshipProposals
                .Include(p => p.Sponsor)
                .Where(p => p.EventId == id && (p.Status == "Received" || p.Status == "Reported"))
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Status,
                    sponsorName = p.PublicSponsorName != "" ? p.PublicSponsorName : p.Sponsor.Name,
                    amount = p.ActualReceivedAmount ?? (p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0),
                    p.UsedAmount,
                    p.ReportSummary,
                    p.ReportedAt
                })
                .ToListAsync();
            var interestedSponsorships = await _context.SponsorshipProposals
                .Include(p => p.Sponsor)
                .Where(p => p.EventId == id && p.Status == "Accepted")
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    sponsorName = p.PublicSponsorName != "" ? p.PublicSponsorName : p.Sponsor.Name,
                    amount = p.Type == "OrganizerRequest" ? p.RequestedAmount ?? 0 : p.OfferedAmount ?? 0,
                    p.RespondedAt
                })
                .ToListAsync();
            var certificates = await _context.Certificates
                .CountAsync(c => c.EventId == id);
            var donationConfirmedAmount = campaigns.Sum(c => c.confirmedAmount);
            var sponsorshipReceivedAmount = sponsorships.Sum(s => s.amount);

            return Ok(new
            {
                eventId = id,
                title = ev.Title,
                status = ev.Status,
                organizer = ev.Organizer != null ? ev.Organizer.Name : "",
                category = ev.Category != null ? ev.Category.Name : "",
                totalRegistrations = registrations.Count,
                confirmedRegistrations = registrations.Count(r => r.Status == "Confirmed"),
                attendedVolunteers = registrations.Count(r => r.IsAttended),
                noShowVolunteers = registrations.Count(r => r.Status == "Confirmed" && !r.IsAttended),
                cancelRequestedCount = registrations.Count(r => r.CancelRequested),
                totalVolunteerHours = registrations.Where(r => r.IsAttended).Sum(r => r.VolunteerHours),
                certificatesIssued = certificates,
                sponsorCount = standaloneSponsors.Count,
                sponsorAmount = standaloneSponsors.Sum(s => s.Amount),
                donationConfirmedAmount,
                donationConfirmedCount = campaigns.Sum(c => c.confirmedCount),
                sponsorshipReceivedAmount,
                financialConfirmedAmount = donationConfirmedAmount + sponsorshipReceivedAmount,
                supportCampaigns = campaigns,
                receivedSponsorships = sponsorships,
                interestedSponsorships
            });
        }

        [HttpPost, Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Create([FromBody] EventCreateDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var organizerVerificationStatus = await _context.OrganizerVerifications
                .Where(v => v.OrganizerId == userId)
                .Select(v => v.Status)
                .FirstOrDefaultAsync();
            if (organizerVerificationStatus != "Verified")
            {
                return BadRequest(new { message = "Bạn cần xác minh tổ chức và được admin duyệt trước khi tạo sự kiện." });
            }

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Event title is required" });
            if (string.IsNullOrWhiteSpace(dto.Location))
                return BadRequest(new { message = "Event location is required" });
            var coordinateError = ValidateCoordinates(dto.Latitude, dto.Longitude);
            if (coordinateError != null)
                return BadRequest(new { message = coordinateError });
            var participantError = ValidateParticipants(dto.MinParticipants, dto.MaxParticipants);
            if (participantError != null)
                return BadRequest(new { message = participantError });
            var dateError = ValidateEventDates(dto.StartDate, dto.EndDate, requireFutureStart: true);
            if (dateError != null)
                return BadRequest(new { message = dateError });
            var radiusError = ValidateCheckInRadius(dto.CheckInRadiusKm);
            if (radiusError != null)
                return BadRequest(new { message = radiusError });

            var ev = new Event
            {
                Title = dto.Title.Trim(), Description = dto.Description ?? "", Location = dto.Location ?? "",
                Latitude = dto.Latitude, Longitude = dto.Longitude,
                CheckInRadiusKm = dto.CheckInRadiusKm ?? 0.5m,
                StartDate = dto.StartDate, EndDate = dto.EndDate,
                MinParticipants = dto.MinParticipants, MaxParticipants = dto.MaxParticipants, RequiresKyc = dto.RequiresKyc, CategoryId = dto.CategoryId,
                OrganizerId = userId, ImageUrl = dto.ImageUrl ?? "",
                RequiredSkillIds = dto.RequiredSkillIds ?? "[]"
            };
            await _eventService.CreateAsync(ev);
            await RecordAuditAsync(userId, "Event.Create", "Event", ev.Id, $"Title={ev.Title}");
            return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
        }

        [HttpPut("{id}"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Update(int id, [FromBody] EventUpdateDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (ev.OrganizerId != userId) return Forbid();
            if (ev.Status == "Cancelled" || ev.Status == "Completed")
                return BadRequest(new { message = "Cannot edit cancelled or completed events" });
            if (dto.Title != null && string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Event title cannot be empty" });
            var nextLatitude = dto.Latitude ?? ev.Latitude;
            var nextLongitude = dto.Longitude ?? ev.Longitude;
            var coordinateError = ValidateCoordinates(nextLatitude, nextLongitude);
            if (coordinateError != null)
                return BadRequest(new { message = coordinateError });
            var nextMinParticipants = dto.MinParticipants ?? ev.MinParticipants;
            var nextMaxParticipants = dto.MaxParticipants ?? ev.MaxParticipants;
            var participantError = ValidateParticipants(nextMinParticipants, nextMaxParticipants);
            if (participantError != null)
                return BadRequest(new { message = participantError });
            var nextStartDate = dto.StartDate ?? ev.StartDate;
            var nextEndDate = dto.EndDate ?? ev.EndDate;
            if (dto.StartDate.HasValue && dto.StartDate.Value < DateTime.UtcNow.AddMinutes(-5))
                return BadRequest(new { message = "Event start time cannot be in the past." });
            var dateError = ValidateEventDates(nextStartDate, nextEndDate);
            if (dateError != null)
                return BadRequest(new { message = dateError });
            var nextCheckInRadiusKm = dto.CheckInRadiusKm ?? ev.CheckInRadiusKm;
            var radiusError = ValidateCheckInRadius(nextCheckInRadiusKm);
            if (radiusError != null)
                return BadRequest(new { message = radiusError });

            var outsideShift = await _context.WorkShifts
                .Where(s => s.EventId == id)
                .Where(s => s.StartTime < nextStartDate || s.EndTime > nextEndDate)
                .OrderBy(s => s.StartTime)
                .Select(s => s.Name)
                .FirstOrDefaultAsync();
            if (outsideShift != null)
                return BadRequest(new { message = $"Cannot change event time because shift \"{outsideShift}\" would be outside the new event time window." });

            var oldStart = ev.StartDate;
            var oldEnd = ev.EndDate;
            var oldLocation = ev.Location;
            var oldLatitude = ev.Latitude;
            var oldLongitude = ev.Longitude;

            ev.Title = dto.Title?.Trim() ?? ev.Title;
            ev.Description = dto.Description ?? ev.Description;
            ev.Location = dto.Location ?? ev.Location;
            ev.Latitude = nextLatitude;
            ev.Longitude = nextLongitude;
            ev.CheckInRadiusKm = nextCheckInRadiusKm;
            ev.StartDate = nextStartDate;
            ev.EndDate = nextEndDate;
            ev.MinParticipants = nextMinParticipants;
            ev.MaxParticipants = nextMaxParticipants;
            ev.RequiresKyc = dto.RequiresKyc ?? ev.RequiresKyc;
            ev.CategoryId = dto.CategoryId ?? ev.CategoryId;
            ev.ImageUrl = dto.ImageUrl ?? ev.ImageUrl;
            ev.RequiredSkillIds = dto.RequiredSkillIds ?? ev.RequiredSkillIds;

            await _eventService.UpdateAsync(ev);
            await RecordAuditAsync(userId, "Event.Update", "Event", ev.Id, $"Status={ev.Status}");

            // Notify confirmed volunteers and active sponsors if the event is Approved and key fields changed
            if (ev.Status == "Approved")
            {
                var changes = new List<string>();
                if (ev.StartDate != oldStart || ev.EndDate != oldEnd)
                    changes.Add($"thời gian ({ev.StartDate:dd/MM/yyyy HH:mm} - {ev.EndDate:dd/MM/yyyy HH:mm})");
                if (!string.Equals(ev.Location ?? "", oldLocation ?? "", StringComparison.Ordinal))
                    changes.Add($"địa điểm ({ev.Location})");
                if (ev.Latitude != oldLatitude || ev.Longitude != oldLongitude)
                    changes.Add("tọa độ bản đồ");
                if (changes.Count > 0)
                {
                    await _eventService.NotifyEventChangeAsync(ev.Id, string.Join(", ", changes));
                }
            }

            return Ok(ev);
        }

        [HttpDelete("{id}"), Authorize]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (role != "Admin" && ev.OrganizerId != userId) return Forbid();

            await _eventService.DeleteAsync(id);
            await RecordAuditAsync(userId, "Event.Delete", "Event", id);
            return Ok(new { message = "Deleted" });
        }

        [HttpPut("{id}/approve"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Approve(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var ev = await _eventService.ApproveAsync(id);
                await RecordAuditAsync(userId, "Event.Approve", "Event", ev.Id);
                return Ok(ev);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{id}/qr/rotate"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RotateQr(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (role != "Admin" && ev.OrganizerId != userId) return Forbid();
            if (ev.Status != "Approved")
                return BadRequest(new { message = "Only approved events can rotate check-in QR" });

            ev.QrCode = $"EVT-{id}-{Guid.NewGuid():N}";
            await _eventService.UpdateAsync(ev);
            await RecordAuditAsync(userId, "Event.RotateQr", "Event", ev.Id, $"HasQr=true");
            return Ok(new { qrCode = ev.QrCode });
        }

        [HttpPut("{id}/reject"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Reject(int id, [FromBody] EventRejectDto? dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var ev = await _eventService.RejectAsync(id, dto?.Reason);
                await RecordAuditAsync(userId, "Event.Reject", "Event", ev.Id, $"Reason={dto?.Reason}");
                return Ok(ev);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}/complete"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Complete(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            try
            {
                var ev = await _eventService.CompleteAsync(id, role == "Admin" ? null : userId);
                await RecordAuditAsync(userId, "Event.Complete", "Event", ev.Id);
                return Ok(ev);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{id}/resubmit"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Resubmit(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var ev = await _eventService.ResubmitAsync(id, userId);
                await RecordAuditAsync(userId, "Event.Resubmit", "Event", ev.Id);
                return Ok(ev);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}/cancel"), Authorize(Roles = "Organizer,Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Cancel(int id, [FromBody] EventCancelDto? dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            try
            {
                var ev = await _eventService.CancelAsync(id, role == "Admin" ? null : userId, dto?.Reason);
                await RecordAuditAsync(userId, "Event.Cancel", "Event", ev.Id, $"Reason={dto?.Reason}");
                return Ok(ev);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("{id}/uncomplete"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Uncomplete(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var ev = await _eventService.UncompleteAsync(id);
                await RecordAuditAsync(userId, "Event.Uncomplete", "Event", ev.Id);
                return Ok(ev);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("auto-complete-overdue"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> AutoCompleteOverdue()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var completed = await _eventService.AutoCompleteOverdueAsync();
            await RecordAuditAsync(userId, "Event.AutoCompleteOverdue", "Event", null, $"Completed={completed}");
            return Ok(new { completed });
        }

        [HttpGet("overdue-preview"), Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOverduePreview()
        {
            var cutoff = DateTime.UtcNow.AddDays(-1);
            var items = await _context.Events
                .Include(e => e.Organizer)
                .Where(e => e.Status == "Approved" && e.EndDate <= cutoff)
                .OrderBy(e => e.EndDate)
                .Select(e => new
                {
                    e.Id,
                    e.Title,
                    e.StartDate,
                    e.EndDate,
                    organizerId = e.OrganizerId,
                    organizerName = e.Organizer != null ? e.Organizer.Name : "",
                    confirmedRegistrations = _context.Registrations.Count(r => r.EventId == e.Id && r.Status == "Confirmed"),
                    attendedRegistrations = _context.Registrations.Count(r => r.EventId == e.Id && r.IsAttended)
                })
                .ToListAsync();

            return Ok(new { items, totalCount = items.Count, cutoff });
        }

        [HttpPut("{id}/transfer"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Transfer(int id, [FromBody] EventTransferDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (ev.Status == "Completed" || ev.Status == "Cancelled")
                return BadRequest(new { message = "Cannot transfer completed or cancelled events" });

            var newOrganizer = await _context.Users.FindAsync(dto.NewOrganizerId);
            if (newOrganizer == null || newOrganizer.UserType != 1 || !newOrganizer.IsActive)
                return BadRequest(new { message = "New organizer must be an active Organizer account" });

            var verified = await _context.OrganizerVerifications
                .Where(v => v.OrganizerId == dto.NewOrganizerId)
                .Select(v => v.Status)
                .FirstOrDefaultAsync();
            if (verified != "Verified")
                return BadRequest(new { message = "New organizer must be verified" });

            var oldOrganizerId = ev.OrganizerId;
            ev.OrganizerId = dto.NewOrganizerId;
            await _eventService.UpdateAsync(ev);
            await _notificationService.SendAsync(
                oldOrganizerId,
                "Sự kiện đã được chuyển giao",
                $"Admin đã chuyển sự kiện '{ev.Title}' sang nhà tổ chức khác.",
                "EventTransferred",
                ev.Id);
            await _notificationService.SendAsync(
                dto.NewOrganizerId,
                "Bạn được nhận quản lý sự kiện",
                $"Admin đã chuyển sự kiện '{ev.Title}' cho bạn quản lý.",
                "EventTransferred",
                ev.Id);
            await RecordAuditAsync(userId, "Event.Transfer", "Event", ev.Id, $"From={oldOrganizerId};To={dto.NewOrganizerId}");
            return Ok(ev);
        }

        [HttpGet("{id}/registrations"), Authorize]
        public async Task<IActionResult> GetRegistrations(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (role != "Admin" && ev.OrganizerId != userId) return Forbid();

            var regs = await _registrationService.GetByEventAsync(id);
            var userIds = regs.Select(r => r.UserId).Distinct().ToList();
            var volunteerSkills = await _context.VolunteerSkills
                .Include(vs => vs.Skill)
                .Where(vs => userIds.Contains(vs.UserId))
                .Select(vs => new
                {
                    vs.UserId,
                    vs.SkillId,
                    skillName = vs.Skill != null ? vs.Skill.Name : "",
                    skillCategory = vs.Skill != null ? vs.Skill.Category : "",
                    vs.Level,
                    vs.VerificationStatus
                })
                .ToListAsync();

            var result = regs.Select(r => new
            {
                r.Id,
                r.EventId,
                r.UserId,
                r.Status,
                r.RegisteredAt,
                r.AttendedAt,
                r.CheckedOutAt,
                r.VolunteerHours,
                r.IsAttended,
                r.CancelRequested,
                r.CancelRequestedAt,
                r.CancelReason,
                r.CancelledAt,
                r.ShiftId,
                r.Note,
                r.User,
                r.Shift,
                volunteerSkills = volunteerSkills.Where(vs => vs.UserId == r.UserId).ToList()
            });

            return Ok(result);
        }

        [HttpGet("{id}/history"), Authorize]
        public async Task<IActionResult> GetEventHistory(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var ev = await _eventService.GetByIdAsync(id);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (role != "Admin" && ev.OrganizerId != userId) return Forbid();

            var logs = await _context.AuditLogs
                .Include(a => a.User)
                .Where(a => a.EntityType == "Event" && a.EntityId == id)
                .OrderByDescending(a => a.CreatedAtUtc)
                .Take(50)
                .Select(a => new
                {
                    a.Id,
                    a.Action,
                    a.Metadata,
                    a.CreatedAtUtc,
                    actorId = a.UserId,
                    actorName = a.User != null ? a.User.Name : null
                })
                .ToListAsync();

            return Ok(logs);
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

        private static string? ValidateCoordinates(decimal? latitude, decimal? longitude)
        {
            if (!latitude.HasValue || !longitude.HasValue)
                return "Event coordinates are required. Please choose a location on the map.";
            if (latitude.Value < -90 || latitude.Value > 90)
                return "Latitude must be between -90 and 90.";
            if (longitude.Value < -180 || longitude.Value > 180)
                return "Longitude must be between -180 and 180.";

            return null;
        }

        private static string? ValidateParticipants(int minParticipants, int maxParticipants)
        {
            if (minParticipants < 1)
                return "Minimum participants must be at least 1.";
            if (maxParticipants < 1)
                return "Maximum participants must be at least 1.";
            if (minParticipants > maxParticipants)
                return "Minimum participants cannot be greater than maximum participants.";
            if (maxParticipants > 10000)
                return "Maximum participants cannot exceed 10000.";

            return null;
        }

        private static string? ValidateEventDates(DateTime startDate, DateTime endDate, bool requireFutureStart = false)
        {
            if (startDate == default || endDate == default)
                return "Event start and end time are required.";
            if (endDate <= startDate)
                return "Event end time must be after start time.";
            if (requireFutureStart && startDate < DateTime.UtcNow.AddMinutes(-5))
                return "Event start time cannot be in the past.";

            return null;
        }

        private static string? ValidateCheckInRadius(decimal? radiusKm)
        {
            if (!radiusKm.HasValue) return null;
            if (radiusKm.Value <= 0 || radiusKm.Value > 10)
                return "Check-in radius must be greater than 0 and at most 10km.";
            return null;
        }
    }

    public class EventCreateDto
    {
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public string? Location { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? CheckInRadiusKm { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int MinParticipants { get; set; } = 1;
        public int MaxParticipants { get; set; }
        public bool RequiresKyc { get; set; }
        public int CategoryId { get; set; }
        public string? ImageUrl { get; set; }
        public string? RequiredSkillIds { get; set; }
    }

    public class EventUpdateDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? CheckInRadiusKm { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? MinParticipants { get; set; }
        public int? MaxParticipants { get; set; }
        public bool? RequiresKyc { get; set; }
        public int? CategoryId { get; set; }
        public string? ImageUrl { get; set; }
        public string? RequiredSkillIds { get; set; }
    }

    public class EventCancelDto
    {
        public string? Reason { get; set; }
    }

    public class EventRejectDto
    {
        public string? Reason { get; set; }
    }

    public class EventTransferDto
    {
        public int NewOrganizerId { get; set; }
    }
}
