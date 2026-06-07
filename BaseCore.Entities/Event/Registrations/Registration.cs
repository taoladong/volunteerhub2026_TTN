using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace BaseCore.Entities
{
    public class Registration
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int UserId { get; set; }
        public int? ShiftId { get; set; }
        public string Status { get; set; } = "Pending"; // Pending | Confirmed | Cancelled
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string Note { get; set; }
        public bool IsAttended { get; set; } = false;
        public DateTime? AttendedAt { get; set; }
        public DateTime? CheckedOutAt { get; set; }
        public decimal VolunteerHours { get; set; } = 0;
        public bool CancelRequested { get; set; } = false;
        public DateTime? CancelRequestedAt { get; set; }
        public string CancelReason { get; set; } = "";
        // null | Scheduled | Passed | Failed | NoShow | Cancelled (denormalize từ InterviewSlot)
        public string? InterviewStatus { get; set; }
        [NotMapped]
        public bool HasRated { get; set; }
        [NotMapped]
        public int? RatingId { get; set; }
        [NotMapped]
        public int? RatingScore { get; set; }
        [NotMapped]
        public string RatingComment { get; set; } = "";

        // Navigation
        public Event Event { get; set; }
        public User User { get; set; }
        public WorkShift Shift { get; set; }
        public InterviewSlot InterviewSlot { get; set; }
    }
}
