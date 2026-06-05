using System;

namespace BaseCore.Entities
{
    public class UserBadge
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int BadgeId { get; set; }
        public DateTime AwardedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User User { get; set; }
        public Badge Badge { get; set; }
    }
}
