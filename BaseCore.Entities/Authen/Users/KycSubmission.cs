using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BaseCore.Entities
{
    public class KycSubmission
    {
        [Key]
        public int Id { get; set; }

        public int VolunteerProfileId { get; set; }

        public string LegalFullName { get; set; } = string.Empty;

        public string IdentityNumber { get; set; } = string.Empty;

        public string? DocumentFrontUrl { get; set; }

        public string? DocumentBackUrl { get; set; }

        public string Status { get; set; } = "Pending";

        public string? ReviewNote { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAt { get; set; }

        [ForeignKey("VolunteerProfileId")]
        public virtual VolunteerProfile VolunteerProfile { get; set; } = null!;
    }
}
