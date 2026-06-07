using System;
using System.Collections.Generic;

namespace BaseCore.Entities
{
    public class VolunteerProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string BloodType { get; set; } = "";
        public string Interests { get; set; } = "";
        public decimal TotalVolunteerHours { get; set; } = 0;
        public decimal TotalDonatedAmount { get; set; } = 0;
        public int DonationCount { get; set; } = 0;
        public string Bio { get; set; } = "";
        public string AvatarUrl { get; set; } = "";
        public string KycStatus { get; set; } = "Unverified";
        public string IdentityFrontImageUrl { get; set; } = "";
        public string IdentityBackImageUrl { get; set; } = "";
        public string PortraitImageUrl { get; set; } = "";
        public DateTime? KycSubmittedAt { get; set; }
        public DateTime? KycReviewedAt { get; set; }
        public int? KycReviewedBy { get; set; }
        public string KycAdminNote { get; set; } = "";

        // Added for AuthService
        public string? PhoneNumber { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        [System.ComponentModel.DataAnnotations.Schema.ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
        public virtual ICollection<VolunteerSkill> VolunteerSkills { get; set; } = new List<VolunteerSkill>();
        public virtual ICollection<KycSubmission> KycSubmissions { get; set; } = new List<KycSubmission>();
    }
}
