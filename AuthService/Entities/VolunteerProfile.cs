namespace AuthService.Entities;

public class VolunteerProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public VerificationStatus KycStatus { get; set; } = VerificationStatus.NotSubmitted;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public bool IsKycVerified => KycStatus == VerificationStatus.Approved;

    public User User { get; set; } = null!;
    public ICollection<VolunteerSkill> VolunteerSkills { get; set; } = new List<VolunteerSkill>();
    public ICollection<KycSubmission> KycSubmissions { get; set; } = new List<KycSubmission>();
}
