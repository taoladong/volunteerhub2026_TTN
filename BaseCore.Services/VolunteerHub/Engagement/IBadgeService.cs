using BaseCore.Entities;

namespace BaseCore.Services.VolunteerHub
{
    public interface IBadgeService
    {
        Task CheckAndAwardAsync(int userId);
        Task<List<Badge>> GetAllAsync();
        Task<List<UserBadge>> GetByUserAsync(int userId);
    }
}
