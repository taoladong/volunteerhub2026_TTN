using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Controllers
{
    [ApiController]
    public class MonitoringController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public MonitoringController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("api/monitoring/health")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> Health()
        {
            var canConnect = await _context.Database.CanConnectAsync();
            return Ok(new
            {
                service = "AuthService",
                status = canConnect ? "Healthy" : "Degraded",
                database = canConnect ? "Connected" : "Unavailable",
                utc = DateTime.UtcNow
            });
        }

        [HttpGet("api/admin/monitoring/summary")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> Summary()
        {
            var now = DateTime.UtcNow;
            var since24h = now.AddHours(-24);

            return Ok(new
            {
                utc = now,
                totals = new
                {
                    users = await _context.Users.CountAsync(),
                    events = await _context.Events.CountAsync(),
                    registrations = await _context.Registrations.CountAsync(),
                    sponsors = await _context.EventSponsors.CountAsync(),
                    certificates = await _context.Certificates.CountAsync(),
                    auditLogs = await _context.AuditLogs.CountAsync()
                },
                last24h = new
                {
                    auditLogs = await _context.AuditLogs.CountAsync(a => a.CreatedAtUtc >= since24h),
                    certificateJobsPending = await _context.CertificateJobs.CountAsync(j => j.Status == "Pending"),
                    certificateJobsFailed = await _context.CertificateJobs.CountAsync(j => j.Status == "Failed")
                }
            });
        }

        [HttpGet("api/admin/audit-logs")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> AuditLogs(
            [FromQuery] string? action,
            [FromQuery] string? entityType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.AuditLogs
                .Include(a => a.User)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(action))
            {
                var normalizedAction = action.Trim();
                query = normalizedAction.EndsWith("*")
                    ? query.Where(a => a.Action.StartsWith(normalizedAction.TrimEnd('*')))
                    : query.Where(a => a.Action == normalizedAction);
            }
            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(a => a.EntityType == entityType);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.CreatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.UserId,
                    userName = a.User != null ? a.User.UserName : "",
                    a.Action,
                    a.EntityType,
                    a.EntityId,
                    a.Metadata,
                    a.IpAddress,
                    a.CreatedAtUtc
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpDelete("api/admin/audit-logs/retention")]
        [HttpDelete("api/monitoring/audit-logs/cleanup")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CleanupAuditLogs([FromQuery] int keepDays = 180)
        {
            keepDays = Math.Clamp(keepDays, 30, 3650);
            var cutoff = DateTime.UtcNow.AddDays(-keepDays);
            var oldLogs = await _context.AuditLogs
                .Where(a => a.CreatedAtUtc < cutoff)
                .ToListAsync();

            if (oldLogs.Count > 0)
            {
                _context.AuditLogs.RemoveRange(oldLogs);
                await _context.SaveChangesAsync();
            }

            return Ok(new { deleted = oldLogs.Count, keepDays, cutoff });
        }
    }
}
