using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services.VolunteerHub
{
    public class AuditLogService : IAuditLogService
    {
        private readonly MySqlDbContext _context;

        public AuditLogService(MySqlDbContext context)
        {
            _context = context;
        }

        public async Task RecordAsync(
            int? userId,
            string action,
            string entityType,
            int? entityId = null,
            string? metadata = null,
            string? ipAddress = null)
        {
            var auditLog = new AuditLog
            {
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Metadata = metadata ?? "",
                IpAddress = ipAddress ?? "",
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
    }
}
