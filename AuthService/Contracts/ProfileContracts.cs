using AuthService.Entities;

namespace AuthService.Contracts;

public record ProfileUpsertRequest(
    string? PhoneNumber,
    DateTime? DateOfBirth,
    string? Gender,
    string? Address,
    string? Bio,
    string? AvatarUrl);

public record ProfileResponse(
    int Id,
    int UserId,
    string? PhoneNumber,
    DateTime? DateOfBirth,
    string? Gender,
    string? Address,
    string? Bio,
    string? AvatarUrl,
    VerificationStatus KycStatus,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyCollection<ProfileSkillResponse> Skills,
    IReadOnlyCollection<KycSubmissionResponse> KycSubmissions);

public record ProfileSkillRequest(
    int? SkillId,
    string? Name,
    string? Description,
    int? YearsOfExperience,
    string? Note);

public record ProfileSkillResponse(
    int SkillId,
    string Name,
    string? Description,
    int? YearsOfExperience,
    string? Note,
    VerificationStatus VerificationStatus);

public record KycSubmitRequest(
    string LegalFullName,
    string IdentityNumber,
    string? DocumentFrontUrl,
    string? DocumentBackUrl);

public record KycSubmissionResponse(
    int Id,
    string LegalFullName,
    string IdentityNumber,
    string? DocumentFrontUrl,
    string? DocumentBackUrl,
    VerificationStatus Status,
    string? ReviewNote,
    DateTime SubmittedAt,
    DateTime? ReviewedAt);
