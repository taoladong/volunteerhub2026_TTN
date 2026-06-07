using System;

namespace BaseCore.Entities
{
    public class OrganizerVerification
    {
        public int Id { get; set; }
        public int OrganizerId { get; set; }
        public User Organizer { get; set; }
        public string OrganizationName { get; set; } = "";
        public string LogoUrl { get; set; } = "";
        public string RepresentativeName { get; set; } = "";
        public string ContactEmail { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public string WebsiteUrl { get; set; } = "";
        public string Description { get; set; } = "";
        public string DocumentUrl { get; set; } = "";
        public string VerificationNote { get; set; } = "";
        public bool CommitmentAccepted { get; set; }
        public string Status { get; set; } = "Unverified";
        public string AdminNote { get; set; } = "";
        public string RejectReason { get; set; } = "";
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public int? VerifiedBy { get; set; }
        public User Verifier { get; set; }
    }
}
