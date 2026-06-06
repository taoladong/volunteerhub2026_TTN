using System;

namespace FinanceService.Entities
{
    public class EventSponsor
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int SponsorId { get; set; }
        public string ContributionType { get; set; } = "Financial";
        public decimal Amount { get; set; }
        public string Note { get; set; } = "";
        public DateTime SponsoredAt { get; set; } = DateTime.UtcNow;
    }
}
