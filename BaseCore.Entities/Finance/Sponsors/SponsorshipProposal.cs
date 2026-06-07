using System;

namespace BaseCore.Entities
{
    public class SponsorshipProposal
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int SponsorId { get; set; }
        public int OrganizerId { get; set; }
        public string Type { get; set; } = "SponsorOffer";
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public decimal? RequestedAmount { get; set; }
        public decimal? OfferedAmount { get; set; }
        public string Purpose { get; set; } = "";
        public string SponsorBenefits { get; set; } = "";
        public string PublicSponsorName { get; set; } = "";
        public string PublicMessage { get; set; } = "";
        public string LogoUrl { get; set; } = "";
        public string AttachmentUrl { get; set; } = "";
        public string ResponseMessage { get; set; } = "";
        public string Status { get; set; } = "Pending";
        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RespondedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public int? ReceivedBy { get; set; }
        public DateTime? ReportedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public int? LegacyEventSponsorId { get; set; }
        public decimal? ActualReceivedAmount { get; set; }
        public decimal? UsedAmount { get; set; }
        public string ReportSummary { get; set; } = "";
        public string ExpenseDetails { get; set; } = "";
        public string ReportAttachmentUrl { get; set; } = "";

        public Event Event { get; set; }
        public User Sponsor { get; set; }
        public User Organizer { get; set; }
        public User Creator { get; set; }
        public User Receiver { get; set; }
        public EventSponsor LegacyEventSponsor { get; set; }
    }
}
