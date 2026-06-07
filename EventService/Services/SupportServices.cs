using BaseCore.Repository;
using BaseCore.Entities;

namespace EventService.Services;

public interface IAuditLogService
{
    Task RecordAsync(int? userId, string action, string entityType, int? entityId = null, string? metadata = null, string? ipAddress = null);
}

public interface INotificationService
{
    Task SendAsync(int userId, string title, string message, string type, int? entityId = null);
}

public interface IBadgeService
{
    Task CheckAndAwardAsync(int userId);
}

public interface IChannelService
{
    Task<Channel> CreateShiftChannelAsync(int shiftId, int createdByUserId);
}

public class AuditLogService : IAuditLogService
{
    private readonly MySqlDbContext _context;

    public AuditLogService(MySqlDbContext context)
    {
        _context = context;
    }

    public async Task RecordAsync(int? userId, string action, string entityType, int? entityId = null, string? metadata = null, string? ipAddress = null)
    {
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Metadata = metadata ?? "",
            IpAddress = ipAddress ?? "",
            CreatedAtUtc = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }
}

public class NotificationService : INotificationService
{
    public Task SendAsync(int userId, string title, string message, string type, int? entityId = null)
    {
        return Task.CompletedTask;
    }
}

public class BadgeService : IBadgeService
{
    public Task CheckAndAwardAsync(int userId)
    {
        return Task.CompletedTask;
    }
}

public class ChannelService : IChannelService
{
    private readonly MySqlDbContext _context;

    public ChannelService(MySqlDbContext context)
    {
        _context = context;
    }

    public async Task<Channel> CreateShiftChannelAsync(int shiftId, int createdByUserId)
    {
        var shift = await _context.WorkShifts.FindAsync(shiftId)
            ?? throw new Exception("Shift not found");
        var channel = new Channel
        {
            EventId = shift.EventId,
            ShiftId = shift.Id,
            ParentChannelId = null,
            Name = shift.Name,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();
        return channel;
    }
}
