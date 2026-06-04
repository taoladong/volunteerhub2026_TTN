using EventService.Entities;

namespace EventService.Services
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
        Task<Entities.Event> ApproveAsync(int eventId);
        Task<Entities.Event> RejectAsync(int eventId, string? reason);
        Task<Entities.Event> CompleteAsync(int eventId, int? organizerId = null);
        Task<Entities.Event> ResubmitAsync(int eventId, int organizerId);
        Task<Entities.Event> CancelAsync(int eventId, int? organizerId, string? reason);
        Task NotifyEventChangeAsync(int eventId, string reason);
        Task<Entities.Event> UncompleteAsync(int eventId);
        Task<int> AutoCompleteOverdueAsync();
    }
}
