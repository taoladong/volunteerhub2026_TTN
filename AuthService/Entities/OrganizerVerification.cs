namespace AuthService.Entities;

public class OrganizerVerification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string? LegalRepresentativeName { get; set; }
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? DocumentUrl { get; set; }
    public VerificationStatus Status { get; set; } = VerificationStatus.NotSubmitted;
    public string? ReviewNote { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? ReviewedByUserId { get; set; }

    public bool IsVerified => Status == VerificationStatus.Approved;

    public User User { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
}
