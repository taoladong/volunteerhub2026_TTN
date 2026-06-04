using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class RegistrationsController : ControllerBase
    {
        private readonly IRegistrationService _registrationService;
        private readonly IInterviewService _interviewService;
        private readonly IAuditLogService _auditLogService;

        public RegistrationsController(IRegistrationService registrationService, IInterviewService interviewService, IAuditLogService auditLogService)
        {
            _registrationService = registrationService;
            _interviewService = interviewService;
            _auditLogService = auditLogService;
        }

        [HttpPost("api/events/{eventId}/register"), Authorize(Roles = "Volunteer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Register(int eventId, [FromBody] RegisterDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.RegisterAsync(eventId, userId, dto.ShiftId, dto.Note);
                await RecordAuditAsync(userId, "Registration.Register", "Registration", reg.Id, $"EventId={eventId};ShiftId={dto.ShiftId}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("api/events/{eventId}/register"), Authorize(Roles = "Volunteer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Withdraw(int eventId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                await _registrationService.WithdrawAsync(eventId, userId);
                await RecordAuditAsync(userId, "Registration.Withdraw", "Event", eventId);
                return Ok(new { message = "Withdrawn" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/register/cancel-request"), Authorize(Roles = "Volunteer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> RequestCancel(int eventId, [FromBody] CancelRequestDto? dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.RequestCancelAsync(eventId, userId, dto?.Reason);
                await RecordAuditAsync(userId, "Registration.RequestCancel", "Registration", reg.Id, $"EventId={eventId}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/walk-in"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> WalkIn(int eventId, [FromBody] WalkInDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.WalkInAsync(eventId, dto.VolunteerUserId, userId, dto.ShiftId, dto.Note);
                await RecordAuditAsync(userId, "Registration.WalkIn", "Registration", reg.Id, $"EventId={eventId};VolunteerId={dto.VolunteerUserId};ShiftId={dto.ShiftId}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/registrations/{regId}/manual-attend"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ManualAttend(int eventId, int regId, [FromBody] ManualAttendDto? dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.ManualAttendAsync(eventId, regId, userId, dto?.Hours);
                await RecordAuditAsync(userId, "Registration.ManualAttend", "Registration", reg.Id, $"EventId={eventId};Hours={reg.VolunteerHours:0.##}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/registrations/{regId}/checkout"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CheckOut(int eventId, int regId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.CheckOutAsync(eventId, regId, userId);
                await RecordAuditAsync(userId, "Registration.CheckOut", "Registration", reg.Id, $"EventId={eventId};Hours={reg.VolunteerHours:0.##}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("api/events/{eventId}/registrations/{regId}/shift"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ChangeShift(int eventId, int regId, [FromBody] ChangeShiftDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.ChangeShiftAsync(eventId, regId, userId, dto.ShiftId);
                await RecordAuditAsync(userId, "Registration.ChangeShift", "Registration", reg.Id, $"EventId={eventId};NewShiftId={dto.ShiftId}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("api/events/{eventId}/registrations/{regId}/hours"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> AdjustHours(int eventId, int regId, [FromBody] AdjustHoursDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.AdjustHoursAsync(eventId, regId, userId, dto.Hours);
                await RecordAuditAsync(userId, "Registration.AdjustHours", "Registration", reg.Id, $"EventId={eventId};Hours={dto.Hours:0.##}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("api/events/{eventId}/registrations/{regId}/confirm"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Confirm(int eventId, int regId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.ConfirmAsync(eventId, regId, userId);
                await RecordAuditAsync(userId, "Registration.Confirm", "Registration", reg.Id, $"EventId={eventId}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("api/events/{eventId}/registrations/{regId}/cancel"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Cancel(int eventId, int regId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.CancelAsync(eventId, regId, userId);
                await RecordAuditAsync(userId, "Registration.Cancel", "Registration", reg.Id, $"EventId={eventId}");
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/registrations/{regId}/interview"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> ScheduleInterview(int eventId, int regId, [FromBody] ScheduleInterviewDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var slot = await _interviewService.ScheduleAsync(eventId, regId, userId, dto.ScheduledAt, dto.DurationMinutes ?? 30, dto.MeetingUrl, dto.Note);
                await RecordAuditAsync(userId, "Interview.Schedule", "InterviewSlot", slot.Id, $"EventId={eventId};RegId={regId};At={dto.ScheduledAt:o}");
                return Ok(slot);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("api/events/{eventId}/registrations/{regId}/interview"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> UpdateInterview(int eventId, int regId, [FromBody] ScheduleInterviewDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var slot = await _interviewService.UpdateAsync(eventId, regId, userId, dto.ScheduledAt, dto.DurationMinutes ?? 30, dto.MeetingUrl, dto.Note);
                await RecordAuditAsync(userId, "Interview.Update", "InterviewSlot", slot.Id, $"EventId={eventId};RegId={regId};At={dto.ScheduledAt:o}");
                return Ok(slot);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("api/events/{eventId}/registrations/{regId}/interview/outcome"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> DecideInterview(int eventId, int regId, [FromBody] InterviewOutcomeDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var slot = await _interviewService.DecideAsync(eventId, regId, userId, dto.Outcome, dto.Note);
                await RecordAuditAsync(userId, "Interview.Decide", "InterviewSlot", slot.Id, $"EventId={eventId};RegId={regId};Outcome={dto.Outcome}");
                return Ok(slot);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("api/events/{eventId}/registrations/{regId}/interview"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CancelInterview(int eventId, int regId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                await _interviewService.CancelAsync(eventId, regId, userId);
                await RecordAuditAsync(userId, "Interview.Cancel", "Registration", regId, $"EventId={eventId}");
                return Ok(new { message = "Interview cancelled" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/registrations/{regId}/checkin"), Authorize(Roles = "Organizer")]
        [EnableRateLimiting("checkin-sensitive")]
        public async Task<IActionResult> CheckIn(int eventId, int regId, [FromBody] CheckInDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.CheckInAsync(eventId, regId, userId, dto.QrCode, dto.Latitude, dto.Longitude);
                await RecordAuditAsync(userId, "Registration.CheckIn", "Registration", reg.Id, BuildCheckInMetadata(eventId, dto));
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("api/events/{eventId}/self-checkin"), Authorize(Roles = "Volunteer")]
        [EnableRateLimiting("checkin-sensitive")]
        public async Task<IActionResult> SelfCheckIn(int eventId, [FromBody] CheckInDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            try
            {
                var reg = await _registrationService.SelfCheckInAsync(eventId, userId, dto.QrCode, dto.Latitude, dto.Longitude);
                await RecordAuditAsync(userId, "Registration.SelfCheckIn", "Registration", reg.Id, BuildCheckInMetadata(eventId, dto));
                return Ok(reg);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("api/my-registrations"), Authorize]
        public async Task<IActionResult> MyRegistrations()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var regs = await _registrationService.GetByUserAsync(userId);
            return Ok(regs);
        }

        [HttpGet("api/events/{eventId}/my-registration"), Authorize]
        public async Task<IActionResult> MyRegistration(int eventId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var reg = await _registrationService.GetByEventAndUserAsync(eventId, userId);
            return Ok(reg);
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

        private string BuildCheckInMetadata(int eventId, CheckInDto dto)
        {
            var method = !string.IsNullOrWhiteSpace(dto.QrCode) ? "QR" : "GPS";
            var hasGps = dto.Latitude.HasValue && dto.Longitude.HasValue;
            return $"EventId={eventId};Method={method};HasQr={!string.IsNullOrWhiteSpace(dto.QrCode)};HasGps={hasGps};Latitude={dto.Latitude};Longitude={dto.Longitude};IP={HttpContext.Connection.RemoteIpAddress}";
        }
    }

    public class RegisterDto
    {
        public int? ShiftId { get; set; }
        public string? Note { get; set; }
    }

    public class CheckInDto
    {
        public string? QrCode { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    public class CancelRequestDto
    {
        public string? Reason { get; set; }
    }

    public class WalkInDto
    {
        public int VolunteerUserId { get; set; }
        public int? ShiftId { get; set; }
        public string? Note { get; set; }
    }

    public class ManualAttendDto
    {
        public decimal? Hours { get; set; }
    }

    public class AdjustHoursDto
    {
        public decimal Hours { get; set; }
    }

    public class ChangeShiftDto
    {
        public int? ShiftId { get; set; }
    }

    public class ScheduleInterviewDto
    {
        public DateTime ScheduledAt { get; set; }
        public string MeetingUrl { get; set; } = "";
        public int? DurationMinutes { get; set; }
        public string Note { get; set; } = "";
    }

    public class InterviewOutcomeDto
    {
        public string Outcome { get; set; } = ""; // Passed | Failed | NoShow
        public string Note { get; set; } = "";
    }
}
