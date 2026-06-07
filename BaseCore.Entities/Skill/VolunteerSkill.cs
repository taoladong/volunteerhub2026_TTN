namespace BaseCore.Entities
{
    public class VolunteerSkill
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int SkillId { get; set; }
        public string Level { get; set; } // "Beginner", "Intermediate", "Expert"
        public string VerificationStatus { get; set; } = "SelfDeclared"; // SelfDeclared | PendingVerification | Verified | Rejected
        public string EvidenceUrl { get; set; } = "";
        public string VerificationNote { get; set; } = "";
        public DateTime? VerificationSubmittedAt { get; set; }
        public DateTime? VerificationReviewedAt { get; set; }
        public int? VerificationReviewedBy { get; set; }
        public string AdminNote { get; set; } = "";

        public int? VolunteerProfileId { get; set; }
        public int? YearsOfExperience { get; set; }
        public string? Note { get; set; }

        // Navigation
        public virtual User User { get; set; }
        public virtual Skill Skill { get; set; }
        public virtual VolunteerProfile VolunteerProfile { get; set; }
    }
}
