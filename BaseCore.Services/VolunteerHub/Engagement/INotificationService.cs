using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface INotificationService
    {
        Task SendAsync(int userId, string title, string message, string type, int? relatedId = null);
        Task<(List<Notification> Items, int TotalCount)> GetByUserAsync(int userId, int page, int pageSize);
        Task MarkReadAsync(int notificationId, int userId);
        Task MarkAllReadAsync(int userId);
    }
}
