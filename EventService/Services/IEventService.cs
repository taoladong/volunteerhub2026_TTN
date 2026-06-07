using BaseCore.Entities;

namespace EventService.Services
{
    public interface IEventService
    {
        Task<(List<BaseCore.Entities.Event> Items, int TotalCount)> SearchAsync(
            string? keyword, int? categoryId, string? status,
            DateTime? startDateFrom, int page, int pageSize, int? skillId = null, string? location = null, bool publicOnly = true);
        Task<List<BaseCore.Entities.Event>> GetByOrganizerAsync(int organizerId);
        Task<List<BaseCore.Entities.Event>> GetRecommendedAsync(int userId);
        Task<BaseCore.Entities.Event?> GetByIdAsync(int id);
        Task<BaseCore.Entities.Event> CreateAsync(BaseCore.Entities.Event ev);
        Task UpdateAsync(BaseCore.Entities.Event ev);
        Task DeleteAsync(int id);
        Task<BaseCore.Entities.Event> ApproveAsync(int eventId);
        Task<BaseCore.Entities.Event> RejectAsync(int eventId, string? reason);
        Task<BaseCore.Entities.Event> CompleteAsync(int eventId, int? organizerId = null);
        Task<BaseCore.Entities.Event> ResubmitAsync(int eventId, int organizerId);
        Task<BaseCore.Entities.Event> CancelAsync(int eventId, int? organizerId, string? reason);
        Task NotifyEventChangeAsync(int eventId, string reason);
        Task<BaseCore.Entities.Event> UncompleteAsync(int eventId);
        Task<int> AutoCompleteOverdueAsync();
    }
}
