using EventService.Data;
using EventService.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore;

public interface IEventRepositoryEF
{
    Task<Event?> GetByIdAsync(int id);
    Task AddAsync(Event entity);
    Task UpdateAsync(Event entity);
    Task DeleteAsync(Event entity);
}

public interface IEventCategoryRepositoryEF
{
    Task<List<EventCategory>> GetAllAsync();
    Task<EventCategory?> GetByIdAsync(int id);
    Task AddAsync(EventCategory entity);
    Task UpdateAsync(EventCategory entity);
    Task DeleteAsync(EventCategory entity);
}

public interface IWorkShiftRepositoryEF
{
    Task<List<WorkShift>> GetByEventAsync(int eventId);
    Task<WorkShift?> GetByIdAsync(int id);
    Task AddAsync(WorkShift entity);
    Task UpdateAsync(WorkShift entity);
    Task DeleteAsync(WorkShift entity);
}

public class EventRepositoryEF : IEventRepositoryEF
{
    private readonly EventDbContext _context;

    public EventRepositoryEF(EventDbContext context)
    {
        _context = context;
    }

    public Task<Event?> GetByIdAsync(int id)
    {
        return _context.Events
            .Include(e => e.Category)
            .Include(e => e.Organizer)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task AddAsync(Event entity)
    {
        _context.Events.Add(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Event entity)
    {
        _context.Events.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Event entity)
    {
        _context.Events.Remove(entity);
        await _context.SaveChangesAsync();
    }
}

public class EventCategoryRepositoryEF : IEventCategoryRepositoryEF
{
    private readonly EventDbContext _context;

    public EventCategoryRepositoryEF(EventDbContext context)
    {
        _context = context;
    }

    public Task<List<EventCategory>> GetAllAsync()
    {
        return _context.EventCategories.OrderBy(c => c.Name).ToListAsync();
    }

    public Task<EventCategory?> GetByIdAsync(int id)
    {
        return _context.EventCategories.FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task AddAsync(EventCategory entity)
    {
        _context.EventCategories.Add(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(EventCategory entity)
    {
        _context.EventCategories.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(EventCategory entity)
    {
        _context.EventCategories.Remove(entity);
        await _context.SaveChangesAsync();
    }
}

public class WorkShiftRepositoryEF : IWorkShiftRepositoryEF
{
    private readonly EventDbContext _context;

    public WorkShiftRepositoryEF(EventDbContext context)
    {
        _context = context;
    }

    public Task<List<WorkShift>> GetByEventAsync(int eventId)
    {
        return _context.WorkShifts
            .Include(s => s.RequiredSkill)
            .Where(s => s.EventId == eventId)
            .OrderBy(s => s.StartTime)
            .ToListAsync();
    }

    public Task<WorkShift?> GetByIdAsync(int id)
    {
        return _context.WorkShifts
            .Include(s => s.RequiredSkill)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task AddAsync(WorkShift entity)
    {
        _context.WorkShifts.Add(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WorkShift entity)
    {
        _context.WorkShifts.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(WorkShift entity)
    {
        _context.WorkShifts.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
