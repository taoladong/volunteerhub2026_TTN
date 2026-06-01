using EventService.Entities;

namespace EventService.Services
{
    public interface IEventService
    {
        Task<(List<Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize, int? skillId = null, string? location = null, bool publicOnly = true);
        Task<List<Event>> GetByOrganizerAsync(int organizerId);
        Task<List<Event>> GetRecommendedAsync(int userId);
        Task<Event?> GetByIdAsync(int id);
        Task<Event> CreateAsync(Event ev);
        Task UpdateAsync(Event ev);
        Task DeleteAsync(int id);
        Task<Event> ApproveAsync(int eventId); // Admin: Approved + create Channel
        Task<Event> RejectAsync(int eventId, string? reason);  // Admin: Rejected + reason
        Task<Event> CompleteAsync(int eventId, int? organizerId = null); // Organizer/Admin: Completed + issue certs
        Task<Event> ResubmitAsync(int eventId, int organizerId); // Organizer: Rejected -> Pending
        Task<Event> CancelAsync(int eventId, int? organizerId, string? reason); // Organizer/Admin: -> Cancelled + cascade
        Task NotifyEventChangeAsync(int eventId, string reason); // Notify confirmed volunteers and active sponsors
        Task<Event> UncompleteAsync(int eventId); // Admin only: Completed -> Approved + revoke certificates
        Task<int> AutoCompleteOverdueAsync(); // Admin trigger: complete Approved events past EndDate
    }
}
