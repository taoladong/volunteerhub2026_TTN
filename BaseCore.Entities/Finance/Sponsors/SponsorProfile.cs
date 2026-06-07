using System;

namespace BaseCore.Entities
{
    public class SponsorProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string OrganizationName { get; set; } = "";
        public string RepresentativeName { get; set; } = "";
        public string ContactEmail { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Website { get; set; } = "";
        public string LogoUrl { get; set; } = "";
        public string Description { get; set; } = "";
        public bool IsVerified { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public User User { get; set; }
    }
}
