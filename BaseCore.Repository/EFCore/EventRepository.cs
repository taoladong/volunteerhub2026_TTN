using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IEventRepositoryEF : IRepository<Entities.Event>
    {
        Task<(List<Entities.Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize);
        Task<List<Entities.Event>> GetByOrganizerAsync(int organizerId);
        Task<Entities.Event?> GetWithDetailsAsync(int id);
    }

    public class EventRepositoryEF : Repository<Entities.Event>, IEventRepositoryEF
    {
        public EventRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<(List<Entities.Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize)
        {
            var query = _dbSet
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.ToLower();
                query = query.Where(e =>
                    e.Title.ToLower().Contains(kw) ||
                    (e.Description != null && e.Description.ToLower().Contains(kw)) ||
                    (e.Location != null && e.Location.ToLower().Contains(kw)));
            }

            if (categoryId.HasValue)
                query = query.Where(e => e.CategoryId == categoryId.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(e => e.Status == status);

            if (startDateFrom.HasValue)
                query = query.Where(e => e.StartDate >= startDateFrom.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<List<Entities.Event>> GetByOrganizerAsync(int organizerId)
        {
            return await _dbSet
                .Include(e => e.Category)
                .Where(e => e.OrganizerId == organizerId)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();
        }

        public async Task<Entities.Event?> GetWithDetailsAsync(int id)
        {
            var ev = await _dbSet
                .Include(e => e.Category)
                .Include(e => e.Organizer)
                .Include(e => e.WorkShifts)
                .Include(e => e.Channels)
                .FirstOrDefaultAsync(e => e.Id == id);
            if (ev != null)
                ev.Channel = ev.Channels?.FirstOrDefault(c => c.ParentChannelId == null);
            return ev;
        }
    }
}
