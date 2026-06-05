using System;

namespace BaseCore.Entities
{
    public class InterviewSlot
    {
        public int Id { get; set; }
        public int RegistrationId { get; set; }     // FK, unique (1 đăng ký = 1 slot)
        public int EventId { get; set; }             // denormalize để query theo sự kiện
        public DateTime ScheduledAt { get; set; }    // UTC
        public int DurationMinutes { get; set; } = 30;
        public string MeetingUrl { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;        // hướng dẫn cho TNV
        public string Status { get; set; } = "Scheduled";       // Scheduled | Passed | Failed | NoShow | Cancelled
        public string DecisionNote { get; set; } = string.Empty; // lý do đạt/không đạt
        public int CreatedBy { get; set; }           // organizerId
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Registration Registration { get; set; }
        public Event Event { get; set; }
    }
}
