namespace AuthService.Entities;

public class VolunteerSkill
{
    public int VolunteerProfileId { get; set; }
    public VolunteerProfile VolunteerProfile { get; set; } = null!;

    public int SkillId { get; set; }
    public Skill Skill { get; set; } = null!;

    public int? YearsOfExperience { get; set; }
    public string? Note { get; set; }
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.NotSubmitted;
}
