using System;

namespace BaseCore.Entities
{
    public class IndividualDonation
    {
        public int Id { get; set; }
        public int CampaignId { get; set; }
        public int UserId { get; set; }
        public decimal Amount { get; set; }
        public string DisplayName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Email { get; set; } = "";
        public string Note { get; set; } = "";
        public bool IsAnonymous { get; set; }
        public string ProofImageUrl { get; set; } = "";
        public string Status { get; set; } = "PendingConfirmation";
        public int? ConfirmedBy { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public string RejectedReason { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public SupportCampaign Campaign { get; set; }
        public User User { get; set; }
        public User Confirmer { get; set; }
    }
}
