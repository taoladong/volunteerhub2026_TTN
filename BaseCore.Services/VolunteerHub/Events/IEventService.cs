using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface IEventService
    {
        Task<(List<Entities.Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize, int? skillId = null, string? location = null, bool publicOnly = true);
        Task<List<Entities.Event>> GetByOrganizerAsync(int organizerId);
        Task<List<Entities.Event>> GetRecommendedAsync(int userId);
        Task<Entities.Event?> GetByIdAsync(int id);
        Task<Entities.Event> CreateAsync(Entities.Event ev);
        Task UpdateAsync(Entities.Event ev);
        Task DeleteAsync(int id);
        Task<Entities.Event> ApproveAsync(int eventId); // Admin: Approved + create Channel
        Task<Entities.Event> RejectAsync(int eventId, string? reason);  // Admin: Rejected + reason
        Task<Entities.Event> CompleteAsync(int eventId, int? organizerId = null, IReadOnlyCollection<ManualCompletionAttendance>? manualAttendances = null); // Organizer/Admin: Completed + issue certs
        Task<Entities.Event> ResubmitAsync(int eventId, int organizerId); // Organizer: Rejected -> Pending
        Task<Entities.Event> CancelAsync(int eventId, int? organizerId, string? reason); // Organizer/Admin: -> Cancelled + cascade
        Task NotifyEventChangeAsync(int eventId, string reason); // Notify confirmed volunteers and active sponsors
        Task<Entities.Event> UncompleteAsync(int eventId); // Admin only: Completed -> Approved + revoke certificates
        Task<int> AutoCompleteOverdueAsync(); // Admin trigger: complete Approved events past EndDate
        Task<int> AutoCloseOverdueCampaignsAsync(); // Đóng các đợt kêu gọi đã quá EndDate
        Task<int> SendCampaignRemindersAsync(); // Nhắc tổ chức: đợt đã đóng chưa báo cáo + donation chờ xác nhận lâu
    }

    public class ManualCompletionAttendance
    {
        public int RegistrationId { get; set; }
        public decimal? Hours { get; set; }
    }
}
