using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services.VolunteerHub
{
    public class AuditLogService : IAuditLogService
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;

        public AuditLogService(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
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

            await _unitOfWork.AuditLogs.AddAsync(auditLog);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
