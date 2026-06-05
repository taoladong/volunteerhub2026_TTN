using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/events/{eventId}/shifts")]
    [ApiController]
    public class WorkShiftsController : ControllerBase
    {
        private readonly IWorkShiftRepositoryEF _repo;
        private readonly IEventRepositoryEF _eventRepo;
        private readonly IAuditLogService _auditLogService;
        private readonly IChannelService _channelService;
        private readonly MySqlDbContext _context;

        public WorkShiftsController(IWorkShiftRepositoryEF repo, IEventRepositoryEF eventRepo, IAuditLogService auditLogService, IChannelService channelService, MySqlDbContext context)
        {
            _repo = repo;
            _eventRepo = eventRepo;
            _auditLogService = auditLogService;
            _channelService = channelService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetByEvent(int eventId)
        {
            var shifts = await _repo.GetByEventAsync(eventId);
            if (shifts.Count == 0) return Ok(shifts);

            var shiftIds = shifts.Select(s => s.Id).ToList();
            var counts = await _context.Registrations
                .Where(r => r.ShiftId != null && shiftIds.Contains(r.ShiftId.Value) && (r.Status == "Pending" || r.Status == "Confirmed"))
                .GroupBy(r => r.ShiftId!.Value)
                .Select(g => new { ShiftId = g.Key, Count = g.Count() })
                .ToListAsync();
            var countMap = counts.ToDictionary(c => c.ShiftId, c => c.Count);

            var result = shifts.Select(s => new
            {
                s.Id,
                s.EventId,
                s.Name,
                s.StartTime,
                s.EndTime,
                s.MaxVolunteers,
                s.RequiredSkillId,
                requiredSkill = s.RequiredSkill == null ? null : new { s.RequiredSkill.Id, s.RequiredSkill.Name, s.RequiredSkill.Category },
                currentRegistrations = countMap.TryGetValue(s.Id, out var c) ? c : 0
            });
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int eventId, int id)
        {
            var shift = await _repo.GetByIdAsync(id);
            if (shift == null || shift.EventId != eventId) return NotFound();
            return Ok(shift);
        }

        [HttpPost, Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Create(int eventId, [FromBody] WorkShiftDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = await _eventRepo.GetByIdAsync(eventId);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (ev.OrganizerId != userId) return Forbid();
            var activeRegistrations = await _context.Registrations
                .CountAsync(r => r.EventId == eventId && (r.Status == "Pending" || r.Status == "Confirmed"));
            if (activeRegistrations > 0)
                return BadRequest(new { message = "Cannot create work shifts after volunteers have registered for this event." });

            var validation = ValidateShift(dto.Name, dto.StartTime, dto.EndTime, dto.MaxVolunteers, ev.StartDate, ev.EndDate);
            if (validation != null) return BadRequest(new { message = validation });

            var shift = new WorkShift
            {
                EventId = eventId,
                Name = dto.Name.Trim(),
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                MaxVolunteers = dto.MaxVolunteers,
                RequiredSkillId = dto.RequiredSkillId
            };
            await _repo.AddAsync(shift);
            if (dto.CreateChannel)
                await _channelService.CreateShiftChannelAsync(shift.Id, userId);
            await RecordAuditAsync(userId, "WorkShift.Create", "WorkShift", shift.Id, $"EventId={eventId}");
            return CreatedAtAction(nameof(GetById), new { eventId, id = shift.Id }, shift);
        }

        [HttpPut("{id}"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Update(int eventId, int id, [FromBody] WorkShiftDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = await _eventRepo.GetByIdAsync(eventId);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (ev.OrganizerId != userId) return Forbid();

            var shift = await _repo.GetByIdAsync(id);
            if (shift == null || shift.EventId != eventId) return NotFound();

            var nextName = dto.Name ?? shift.Name;
            var nextStart = dto.StartTime != default ? dto.StartTime : shift.StartTime;
            var nextEnd = dto.EndTime != default ? dto.EndTime : shift.EndTime;
            var nextMax = dto.MaxVolunteers > 0 ? dto.MaxVolunteers : shift.MaxVolunteers;
            var validation = ValidateShift(nextName, nextStart, nextEnd, nextMax, ev.StartDate, ev.EndDate);
            if (validation != null) return BadRequest(new { message = validation });

            shift.Name = nextName.Trim();
            shift.StartTime = nextStart;
            shift.EndTime = nextEnd;
            shift.MaxVolunteers = nextMax;
            shift.RequiredSkillId = dto.RequiredSkillId ?? shift.RequiredSkillId;

            await _repo.UpdateAsync(shift);
            await RecordAuditAsync(userId, "WorkShift.Update", "WorkShift", shift.Id, $"EventId={eventId}");
            return Ok(shift);
        }

        [HttpDelete("{id}"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Delete(int eventId, int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var ev = await _eventRepo.GetByIdAsync(eventId);
            if (ev == null) return NotFound(new { message = "Event not found" });
            if (ev.OrganizerId != userId) return Forbid();

            var shift = await _repo.GetByIdAsync(id);
            if (shift == null || shift.EventId != eventId) return NotFound();

            var activeRegs = await _context.Registrations.CountAsync(r => r.ShiftId == id && (r.Status == "Pending" || r.Status == "Confirmed"));
            if (activeRegs > 0)
                return BadRequest(new { message = $"Không thể xóa ca này vì đang có {activeRegs} đăng ký active. Vui lòng hủy hoặc chuyển đăng ký sang ca khác trước." });

            var subChannel = await _context.Channels
                .Include(c => c.Posts)
                .FirstOrDefaultAsync(c => c.ShiftId == id);
            if (subChannel != null)
            {
                if (subChannel.Posts.Any())
                    return BadRequest(new { message = "Không thể xóa ca này vì kênh trao đổi của ca đã có bài viết." });

                _context.Channels.Remove(subChannel);
                await _context.SaveChangesAsync();
            }

            await _repo.DeleteAsync(shift);
            await RecordAuditAsync(userId, "WorkShift.Delete", "WorkShift", id, $"EventId={eventId}");
            return Ok(new { message = "Deleted" });
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

        private static string? ValidateShift(string? name, DateTime startTime, DateTime endTime, int maxVolunteers, DateTime eventStart, DateTime eventEnd)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "Shift name is required";
            if (name.Trim().Length > 100)
                return "Shift name must be 100 characters or less";
            if (startTime == default || endTime == default)
                return "Shift start and end time are required";
            if (endTime <= startTime)
                return "Shift end time must be after start time";
            if (maxVolunteers < 1 || maxVolunteers > 1000)
                return "Shift max volunteers must be between 1 and 1000";
            if (startTime < eventStart || endTime > eventEnd)
                return $"Shift time must be within the event time window ({eventStart:dd/MM/yyyy HH:mm} - {eventEnd:dd/MM/yyyy HH:mm}).";

            return null;
        }
    }

    public class WorkShiftDto
    {
        public string Name { get; set; } = "";
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int MaxVolunteers { get; set; }
        public int? RequiredSkillId { get; set; }
        public bool CreateChannel { get; set; }
    }
}
