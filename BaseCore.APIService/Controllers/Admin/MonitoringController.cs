using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class MonitoringController : ControllerBase
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;

        public MonitoringController(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet("api/monitoring/health")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> Health()
        {
            var canConnect = await _unitOfWork.CanConnectAsync();
            return Ok(new
            {
                service = "BaseCore.APIService",
                status = canConnect ? "Healthy" : "Degraded",
                database = canConnect ? "Connected" : "Unavailable",
                utc = DateTime.UtcNow
            });
        }

        [HttpGet("api/admin/monitoring/summary"), Authorize(Roles = "Admin")]
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
                    users = await _unitOfWork.Users.GetQueryable().CountAsync(),
                    events = await _unitOfWork.Events.GetQueryable().CountAsync(),
                    registrations = await _unitOfWork.Registrations.GetQueryable().CountAsync(),
                    sponsors = await _unitOfWork.EventSponsors.GetQueryable().CountAsync(),
                    certificates = await _unitOfWork.Certificates.GetQueryable().CountAsync(),
                    auditLogs = await _unitOfWork.AuditLogs.GetQueryable().CountAsync()
                },
                last24h = new
                {
                    auditLogs = await _unitOfWork.AuditLogs.GetQueryable().CountAsync(a => a.CreatedAtUtc >= since24h),
                    certificateJobsPending = await _unitOfWork.CertificateJobs.GetQueryable().CountAsync(j => j.Status == "Pending"),
                    certificateJobsFailed = await _unitOfWork.CertificateJobs.GetQueryable().CountAsync(j => j.Status == "Failed")
                }
            });
        }

        [HttpGet("api/admin/audit-logs"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> AuditLogs(
            [FromQuery] string? action,
            [FromQuery] string? entityType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _unitOfWork.AuditLogs.GetQueryable()
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

        [HttpDelete("api/admin/audit-logs/retention"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> CleanupAuditLogs([FromQuery] int keepDays = 180)
        {
            keepDays = Math.Clamp(keepDays, 30, 3650);
            var cutoff = DateTime.UtcNow.AddDays(-keepDays);
            var oldLogs = await _unitOfWork.AuditLogs.GetQueryable()
                .Where(a => a.CreatedAtUtc < cutoff)
                .ToListAsync();

            if (oldLogs.Count > 0)
            {
                await _unitOfWork.AuditLogs.DeleteRangeAsync(oldLogs);
                await _unitOfWork.SaveChangesAsync();
            }

            return Ok(new { deleted = oldLogs.Count, keepDays, cutoff });
        }
    }
}








