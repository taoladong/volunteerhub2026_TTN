namespace AuthService.Entities;

public class VolunteerSkill
{
	public int VolunteerProfileId { get; set; }
	public VolunteerProfile VolunteerProfile { get; set; } = null!;

	public int SkillId { get; set;}
	public Skill Skill { get; set;}

	public int? YearsOf
}