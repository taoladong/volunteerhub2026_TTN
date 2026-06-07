using BaseCore.Entities;

namespace AuthService.Contracts;

public record ProfileUpsertRequest(
    string? PhoneNumber,
    DateTime? DateOfBirth,
    string? Gender,
    string? Address,
    string? Bio,
    string? AvatarUrl,
    string? BloodType,
    string? Languages,
    string? Interests);

public record ProfileResponse(
    int Id,
    int UserId,
    string? PhoneNumber,
    DateTime? DateOfBirth,
    string? Gender,
    string? Address,
    string? Bio,
    string? AvatarUrl,
    string KycStatus,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyCollection<ProfileSkillResponse> Skills,
    IReadOnlyCollection<KycSubmissionResponse> KycSubmissions);

public record ProfileSkillRequest(
    int? SkillId,
    string? Name,
    string? Description,
    int? YearsOfExperience,
    string? Note,
    string? Level,
    string? EvidenceUrl,
    string? VerificationNote);

public record ProfileSkillResponse(
    int SkillId,
    string Name,
    string? Description,
    int? YearsOfExperience,
    string? Note,
    string VerificationStatus,
    string? Level,
    string? EvidenceUrl,
    string? VerificationNote);

public record KycSubmitRequest(
    string? LegalFullName,
    string? IdentityNumber,
    string? DocumentFrontUrl,
    string? DocumentBackUrl,
    string? IdentityFrontImageUrl,
    string? IdentityBackImageUrl,
    string? PortraitImageUrl,
    bool ConfirmReverify);

public record KycSubmissionResponse(
    int Id,
    string LegalFullName,
    string IdentityNumber,
    string? DocumentFrontUrl,
    string? DocumentBackUrl,
    string Status,
    string? ReviewNote,
    DateTime SubmittedAt,
    DateTime? ReviewedAt);
