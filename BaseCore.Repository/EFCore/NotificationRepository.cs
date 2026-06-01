using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface INotificationRepositoryEF : IRepository<Notification>
    {
        Task<(List<Notification> Items, int TotalCount)> GetByUserAsync(int userId, int page, int pageSize);
        Task MarkReadAsync(int notificationId, int userId);
        Task MarkAllReadAsync(int userId);
    }

    public class NotificationRepositoryEF : Repository<Notification>, INotificationRepositoryEF
    {
        public NotificationRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<(List<Notification> Items, int TotalCount)> GetByUserAsync(int userId, int page, int pageSize)
        {
            var query = _dbSet.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt);
            var totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return (items, totalCount);
        }

        public async Task MarkReadAsync(int notificationId, int userId)
        {
            var n = await _dbSet.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
            if (n != null) { n.IsRead = true; await _context.SaveChangesAsync(); }
        }

        public async Task MarkAllReadAsync(int userId)
        {
            var items = await _dbSet.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
            items.ForEach(n => n.IsRead = true);
            await _context.SaveChangesAsync();
        }
    }
}
