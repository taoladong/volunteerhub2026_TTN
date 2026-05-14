namespace AuthService.Entities;

public class KycSubmission
{
    public int Id { get; set; }
    public int VolunteerProfileId { get; set; }
    public string LegalFullName { get; set; } = string.Empty;
    public string IdentityNumber { get; set; } = string.Empty;
    public string? DocumentFrontUrl { get; set; }
    public string? DocumentBackUrl { get; set; }
    public VerificationStatus Status { get; set; } = VerificationStatus.Pending;
    public string? ReviewNote { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedByUserId { get; set; }

    public VolunteerProfile VolunteerProfile { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
}
