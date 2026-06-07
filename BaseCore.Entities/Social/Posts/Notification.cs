using System;

namespace BaseCore.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public bool IsRead { get; set; } = false;
        public string Type { get; set; } // "EventApproved"|"RegistrationConfirmed"|"EventReminder"|"NewPost"|"CertificateIssued"|"BadgeAwarded"
        public int? RelatedId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User User { get; set; }
    }
}
