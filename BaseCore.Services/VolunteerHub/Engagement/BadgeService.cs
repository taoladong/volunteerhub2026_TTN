using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services.VolunteerHub
{
    public class BadgeService : IBadgeService
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;
        private readonly INotificationService _notificationService;

        public BadgeService(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork, INotificationService notificationService)
        {
            _unitOfWork = unitOfWork;
            _notificationService = notificationService;
        }

        public async Task CheckAndAwardAsync(int userId)
        {
            var profile = await _unitOfWork.VolunteerProfiles.GetQueryable().FirstOrDefaultAsync(p => p.UserId == userId);
            var totalHours = profile?.TotalVolunteerHours ?? 0;
            var totalEvents = await _unitOfWork.Registrations.GetQueryable()
                .CountAsync(r => r.UserId == userId && r.IsAttended);

            var allBadges = await _unitOfWork.Badges.GetAllAsync();
            var ownedBadgeIds = await _unitOfWork.UserBadges.GetQueryable()
                .Where(ub => ub.UserId == userId).Select(ub => ub.BadgeId).ToListAsync();

            foreach (var badge in allBadges)
            {
                if (ownedBadgeIds.Contains(badge.Id)) continue;
                if (MeetsCondition(badge.Condition, totalEvents, totalHours))
                {
                    await _unitOfWork.UserBadges.AddAsync(new UserBadge
                    {
                        UserId = userId,
                        BadgeId = badge.Id,
                        AwardedAt = DateTime.UtcNow
                    });
                    await _unitOfWork.SaveChangesAsync();

                    await _notificationService.SendAsync(userId,
                        "Huy hiệu mới!", $"Bạn đã nhận được huy hiệu '{badge.Name}'.",
                        "BadgeAwarded", badge.Id);
                }
            }
        }

        private bool MeetsCondition(string condition, int totalEvents, decimal totalHours)
        {
            if (string.IsNullOrEmpty(condition)) return false;
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, decimal>>(condition);
                if (dict == null) return false;
                if (dict.TryGetValue("min_events", out var minEvents) && totalEvents < (int)minEvents) return false;
                if (dict.TryGetValue("min_hours", out var minHours) && totalHours < minHours) return false;
                return true;
            }
            catch { return false; }
        }

        public async Task<List<Badge>> GetAllAsync()
        {
            return await _unitOfWork.Badges.GetQueryable().ToListAsync();
        }

        public async Task<List<UserBadge>> GetByUserAsync(int userId)
        {
            return await _unitOfWork.UserBadges.GetQueryable()
                .Include(ub => ub.Badge)
                .Where(ub => ub.UserId == userId)
                .OrderByDescending(ub => ub.AwardedAt)
                .ToListAsync();
        }
    }
}
