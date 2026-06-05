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
    public class AdminEventController : ControllerBase
    {
        private readonly MySqlDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public AdminEventController(MySqlDbContext context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        [HttpGet("export/events-detail")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> ExportEvents([FromQuery] string format = "json")
        {
            var events = await _context.Events
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .Select(e => new
                {
                    e.Id,
                    e.Title,
                    e.Status,
                    e.Location,
                    e.StartDate,
                    e.EndDate,
                    e.MinParticipants,
                    e.MaxParticipants,
                    e.CurrentParticipants,
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
                {
                    csv.AppendLine($"{e.Id},{EscapeCsv(e.Title)},{e.Status},{EscapeCsv(e.Location)},{e.StartDate:yyyy-MM-dd},{e.EndDate:yyyy-MM-dd},{e.MinParticipants},{e.MaxParticipants},{e.CurrentParticipants},{EscapeCsv(e.Category)},{EscapeCsv(e.Organizer)},{e.CreatedAt:yyyy-MM-dd}");
                }

                return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "events.csv");
            }

            await RecordAuditAsync("Admin.Export.Events", "Event", null, "Format=json");
            return Ok(events);
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
