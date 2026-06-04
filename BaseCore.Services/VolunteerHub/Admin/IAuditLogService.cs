namespace BaseCore.Services.VolunteerHub
{
    public interface IAuditLogService
    {
        Task RecordAsync(
            int? userId,
            string action,
            string entityType,
            int? entityId = null,
            string? metadata = null,
            string? ipAddress = null);
    }
}
