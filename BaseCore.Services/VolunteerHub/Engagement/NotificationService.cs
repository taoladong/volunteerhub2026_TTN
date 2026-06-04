using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services.VolunteerHub
{
    public class NotificationService : INotificationService
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;

        public NotificationService(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task SendAsync(int userId, string title, string message, string type, int? relatedId = null)
        {
            await _unitOfWork.Notifications.AddAsync(new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                RelatedId = relatedId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<(List<Notification> Items, int TotalCount)> GetByUserAsync(int userId, int page, int pageSize)
        {
            var query = _unitOfWork.Notifications.GetQueryable()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return (items, totalCount);
        }

        public async Task MarkReadAsync(int notificationId, int userId)
        {
            var n = await _unitOfWork.Notifications.GetQueryable()
                .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId);
            if (n != null) { n.IsRead = true; await _unitOfWork.SaveChangesAsync(); }
        }

        public async Task MarkAllReadAsync(int userId)
        {
            var items = await _unitOfWork.Notifications.GetQueryable()
                .Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
            items.ForEach(n => n.IsRead = true);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
