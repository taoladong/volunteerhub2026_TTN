using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace BaseCore.Entities
{
    public class Event
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Location { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal CheckInRadiusKm { get; set; } = 0.5m;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int MinParticipants { get; set; } = 1;
        public int MaxParticipants { get; set; }
        public int CurrentParticipants { get; set; } = 0;
        public bool RequiresKyc { get; set; } = false;
        public bool RequiresInterview { get; set; } = false; // bắt buộc phỏng vấn trước khi confirm
        public string RequiredSkillIds { get; set; } // JSON array, e.g. "[1,3]"
        public string Status { get; set; } = "Pending"; // Pending | Approved | Completed | Rejected | Cancelled
        public int CategoryId { get; set; }
        public int OrganizerId { get; set; }
        public string ImageUrl { get; set; }
        public string QrCode { get; set; } // auto-generated when Approved
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string CancelReason { get; set; } = "";
        public DateTime? CancelledAt { get; set; }
        public string RejectReason { get; set; } = "";

        // Navigation
        public EventCategory Category { get; set; }
        public User Organizer { get; set; }
        public List<Registration> Registrations { get; set; }
        public List<WorkShift> WorkShifts { get; set; }
        [NotMapped]
        public Channel Channel { get; set; }
        public List<Channel> Channels { get; set; }
    }
}
