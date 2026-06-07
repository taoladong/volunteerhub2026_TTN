using System;

namespace BaseCore.Entities
{
    public class EventSponsor
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int SponsorId { get; set; }
        public string ContributionType { get; set; } // "Financial", "Supplies"
        public decimal Amount { get; set; }
        public string Note { get; set; }
        public DateTime SponsoredAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Event Event { get; set; }
        public User Sponsor { get; set; }
    }
}
