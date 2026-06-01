using System.Collections.Generic;
using System.Threading.Tasks;
using EventService.Entities;
using EventService.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace EventService.Services
{
    public interface IAuditLogService
    {
        Task RecordAsync(int? userId, string action, string entityType, int? entityId = null, string metadata = null, string ipAddress = null);
    }

    public class AuditLogService : IAuditLogService
    {
        private readonly EventDbContext _context;
        public AuditLogService(EventDbContext context) { _context = context; }
        public async Task RecordAsync(int? userId, string action, string entityType, int? entityId = null, string metadata = null, string ipAddress = null)
        {
            _context.AuditLogs.Add(new AuditLog { UserId = userId, Action = action, EntityType = entityType, EntityId = entityId, Metadata = metadata, IpAddress = ipAddress, CreatedAtUtc = System.DateTime.UtcNow });
            await _context.SaveChangesAsync();
        }
    }

    public interface INotificationService
    {
        Task SendAsync(int userId, string title, string body, string type = null, int? relatedId = null);
    }

    public class NotificationService : INotificationService
    {
        public Task SendAsync(int userId, string title, string body, string type = null, int? relatedId = null)
        {
            return Task.CompletedTask;
        }
    }

    public interface IChannelService
    {
        Task CreateEventChannelAsync(int eventId, string eventTitle, int organizerId);
        Task CreateShiftChannelAsync(int shiftId, int organizerId);
    }

    public class ChannelService : IChannelService
    {
        public Task CreateEventChannelAsync(int eventId, string eventTitle, int organizerId) { return Task.CompletedTask; }
        public Task CreateShiftChannelAsync(int shiftId, int organizerId) { return Task.CompletedTask; }
    }

    public interface IBadgeService
    {
        Task CheckAndAwardAsync(int userId);
    }

    public class BadgeService : IBadgeService
    {
        public Task CheckAndAwardAsync(int userId) { return Task.CompletedTask; }
    }

    public interface IWorkShiftRepositoryEF
    {
        Task<List<WorkShift>> GetByEventAsync(int eventId);
        Task<WorkShift> GetByIdAsync(int id);
        Task AddAsync(WorkShift shift);
        Task UpdateAsync(WorkShift shift);
        Task DeleteAsync(WorkShift shift);
    }

    public class WorkShiftRepositoryEF : IWorkShiftRepositoryEF
    {
        private readonly EventDbContext _context;
        public WorkShiftRepositoryEF(EventDbContext context) { _context = context; }
        public Task<List<WorkShift>> GetByEventAsync(int eventId) => _context.WorkShifts.Where(w => w.EventId == eventId).ToListAsync();
        public async Task<WorkShift> GetByIdAsync(int id) => await _context.WorkShifts.FindAsync(id);
        public async Task AddAsync(WorkShift shift) { _context.WorkShifts.Add(shift); await _context.SaveChangesAsync(); }
        public async Task UpdateAsync(WorkShift shift) { _context.WorkShifts.Update(shift); await _context.SaveChangesAsync(); }
        public async Task DeleteAsync(WorkShift shift) { _context.WorkShifts.Remove(shift); await _context.SaveChangesAsync(); }
    }

    public interface IEventRepositoryEF
    {
        Task<Event> GetByIdAsync(int id);
    }

    public class EventRepositoryEF : IEventRepositoryEF
    {
        private readonly EventDbContext _context;
        public EventRepositoryEF(EventDbContext context) { _context = context; }
        public async Task<Event> GetByIdAsync(int id) => await _context.Events.FindAsync(id);
    }

    public interface IEventCategoryRepositoryEF
    {
        Task<List<EventCategory>> GetAllAsync();
        Task<EventCategory> GetByIdAsync(int id);
        Task AddAsync(EventCategory entity);
        Task UpdateAsync(EventCategory entity);
        Task DeleteAsync(EventCategory entity);
    }

    public class EventCategoryRepositoryEF : IEventCategoryRepositoryEF
    {
        private readonly EventDbContext _context;
        public EventCategoryRepositoryEF(EventDbContext context) { _context = context; }
        public Task<List<EventCategory>> GetAllAsync() => _context.EventCategories.ToListAsync();
        public async Task<EventCategory> GetByIdAsync(int id) => await _context.EventCategories.FindAsync(id);
        public async Task AddAsync(EventCategory entity) { _context.EventCategories.Add(entity); await _context.SaveChangesAsync(); }
        public async Task UpdateAsync(EventCategory entity) { _context.EventCategories.Update(entity); await _context.SaveChangesAsync(); }
        public async Task DeleteAsync(EventCategory entity) { _context.EventCategories.Remove(entity); await _context.SaveChangesAsync(); }
    }
}
