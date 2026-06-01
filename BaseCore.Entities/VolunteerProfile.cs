namespace BaseCore.Entities
{
    public class VolunteerProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string BloodType { get; set; }
        public string Interests { get; set; }
        public decimal TotalVolunteerHours { get; set; } = 0;
        public decimal TotalDonatedAmount { get; set; } = 0; // tổng đã ủng hộ (Confirmed)
        public int DonationCount { get; set; } = 0;           // số lần ủng hộ (Confirmed)
        public string Bio { get; set; }
        public string AvatarUrl { get; set; }
        public string KycStatus { get; set; } = "Unverified"; // Unverified | PendingVerification | Verified | Rejected
        public string IdentityFrontImageUrl { get; set; } = "";
        public string IdentityBackImageUrl { get; set; } = "";
        public string PortraitImageUrl { get; set; } = "";
        public DateTime? KycSubmittedAt { get; set; }
        public DateTime? KycReviewedAt { get; set; }
        public int? KycReviewedBy { get; set; }
        public string KycAdminNote { get; set; } = "";

        // Navigation
        public User User { get; set; }
    }
}
