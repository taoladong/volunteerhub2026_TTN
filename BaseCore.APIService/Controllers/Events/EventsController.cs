using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services.VolunteerHub;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/events")]
    [ApiController]
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;
        private readonly IRegistrationService _registrationService;
        private readonly IAuditLogService _auditLogService;
        private readonly INotificationService _notificationService;
        public EventsController(
            IEventService eventService,
            IRegistrationService registrationService,
            IAuditLogService auditLogService,
            INotificationService notificationService)
        {
            _eventService = eventService;
            _registrationService = registrationService;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
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
            try
            {
                var dict = await _eventService.GetImpactAsync(id);
                return Ok(dict);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost, Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Create([FromBody] EventCreateDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = new Entities.Event
            {
                Title = dto.Title?.Trim() ?? "", Description = dto.Description ?? "", Location = dto.Location ?? "",
                Latitude = dto.Latitude, Longitude = dto.Longitude,
                CheckInRadiusKm = dto.CheckInRadiusKm ?? 0.5m,
                StartDate = dto.StartDate, EndDate = dto.EndDate,
                MinParticipants = dto.MinParticipants, MaxParticipants = dto.MaxParticipants, RequiresKyc = dto.RequiresKyc, CategoryId = dto.CategoryId,
                OrganizerId = userId, ImageUrl = dto.ImageUrl ?? "",
                RequiredSkillIds = dto.RequiredSkillIds ?? "[]"
            };
            
            try
            {
                await _eventService.CreateAsync(ev);
                await RecordAuditAsync(userId, "Event.Create", "Event", ev.Id, $"Title={ev.Title}");
                return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

            var oldStart = ev.StartDate;
            var oldEnd = ev.EndDate;
            var oldLocation = ev.Location;
            var oldLatitude = ev.Latitude;
            var oldLongitude = ev.Longitude;

            ev.Title = dto.Title?.Trim() ?? ev.Title;
            ev.Description = dto.Description ?? ev.Description;
            ev.Location = dto.Location ?? ev.Location;
            ev.Latitude = dto.Latitude ?? ev.Latitude;
            ev.Longitude = dto.Longitude ?? ev.Longitude;
            ev.CheckInRadiusKm = dto.CheckInRadiusKm ?? ev.CheckInRadiusKm;
            ev.StartDate = dto.StartDate ?? ev.StartDate;
            ev.EndDate = dto.EndDate ?? ev.EndDate;
            ev.MinParticipants = dto.MinParticipants ?? ev.MinParticipants;
            ev.MaxParticipants = dto.MaxParticipants ?? ev.MaxParticipants;
            ev.RequiresKyc = dto.RequiresKyc ?? ev.RequiresKyc;
            ev.CategoryId = dto.CategoryId ?? ev.CategoryId;
            ev.ImageUrl = dto.ImageUrl ?? ev.ImageUrl;
            ev.RequiredSkillIds = dto.RequiredSkillIds ?? ev.RequiredSkillIds;

            try
            {
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
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
            var result = await _eventService.GetOverduePreviewAsync();
            return Ok(new { items = result.Items, totalCount = result.TotalCount, cutoff = result.Cutoff });
        }

        [HttpPut("{id}/transfer"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Transfer(int id, [FromBody] EventTransferDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            try
            {
                var ev = await _eventService.TransferAsync(id, dto.NewOrganizerId);
                
                await _notificationService.SendAsync(
                    ev.OrganizerId,
                    "Bạn được nhận quản lý sự kiện",
                    $"Admin đã chuyển sự kiện '{ev.Title}' cho bạn quản lý.",
                    "EventTransferred",
                    ev.Id);
                await RecordAuditAsync(userId, "Event.Transfer", "Event", ev.Id, $"To={dto.NewOrganizerId}");
                return Ok(ev);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

            var result = await _eventService.GetRegistrationsAsync(id);
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

            var logs = await _eventService.GetEventHistoryAsync(id);
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





