using System.Text.RegularExpressions;
using AuthService.Contracts;
using BaseCore.Repository;
using BaseCore.Entities;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private const int BioMaxLength = 500;
    private const int AddressMaxLength = 250;

    private static readonly Regex PhoneRegex = new(
        @"^\+?[0-9]{9,15}$",
        RegexOptions.Compiled);

    private static readonly Regex IdentityNumberRegex = new(
        @"^[0-9]{9,12}$",
        RegexOptions.Compiled);

    private static readonly HashSet<string> AllowedGenders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Male",
        "Female",
        "Other"
    };

    private readonly MySqlDbContext _dbContext;

    public ProfileController(MySqlDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("me")]
    public async Task<ActionResult<ProfileResponse>> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var profile = await LoadProfileAsync(userId, cancellationToken);

        if (profile is null)
        {
            return NotFound(new { message = "Profile was not found." });
        }

        return Ok(ToProfileResponse(profile));
    }

    [HttpGet]
    public Task<ActionResult<ProfileResponse>> GetCurrent(CancellationToken cancellationToken)
    {
        return GetMe(cancellationToken);
    }

    [HttpPost]
    public async Task<ActionResult<ProfileResponse>> Create(ProfileUpsertRequest request, CancellationToken cancellationToken)
    {
        var profileValidationError = ValidateProfileRequest(request);
        if (profileValidationError is not null)
        {
            return BadRequest(new { message = profileValidationError });
        }

        var userId = User.GetRequiredUserId();
        var exists = await _dbContext.VolunteerProfiles.AnyAsync(profile => profile.UserId == userId, cancellationToken);
        if (exists)
        {
            return Conflict(new { message = "Profile already exists." });
        }

        var profile = new VolunteerProfile { UserId = userId };
        ApplyProfileRequest(profile, request);

        _dbContext.VolunteerProfiles.Add(profile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var createdProfile = await LoadProfileAsync(userId, cancellationToken);
        return CreatedAtAction(nameof(GetMe), ToProfileResponse(createdProfile!));
    }

    [HttpPut("me")]
    public async Task<ActionResult<ProfileResponse>> UpdateMe(ProfileUpsertRequest request, CancellationToken cancellationToken)
    {
        var profileValidationError = ValidateProfileRequest(request);
        if (profileValidationError is not null)
        {
            return BadRequest(new { message = profileValidationError });
        }

        var userId = User.GetRequiredUserId();
        var profile = await _dbContext.VolunteerProfiles.FirstOrDefaultAsync(entity => entity.UserId == userId, cancellationToken);
        if (profile is null)
        {
            profile = new VolunteerProfile { UserId = userId };
            _dbContext.VolunteerProfiles.Add(profile);
        }

        ApplyProfileRequest(profile, request);
        profile.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updatedProfile = await LoadProfileAsync(userId, cancellationToken);
        return Ok(ToProfileResponse(updatedProfile!));
    }

    [HttpPut]
    public Task<ActionResult<ProfileResponse>> UpdateCurrent(ProfileUpsertRequest request, CancellationToken cancellationToken)
    {
        return UpdateMe(request, cancellationToken);
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMe(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var profile = await _dbContext.VolunteerProfiles.FirstOrDefaultAsync(entity => entity.UserId == userId, cancellationToken);
        if (profile is null)
        {
            return NotFound(new { message = "Profile was not found." });
        }

        _dbContext.VolunteerProfiles.Remove(profile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("skills")]
    public async Task<ActionResult<IReadOnlyCollection<ProfileSkillResponse>>> GetSkills(CancellationToken cancellationToken)
    {
        var profile = await LoadProfileAsync(User.GetRequiredUserId(), cancellationToken);
        if (profile is null)
        {
            return NotFound(new { message = "Profile was not found." });
        }

        return Ok(profile.VolunteerSkills.Select(ToProfileSkillResponse).ToArray());
    }

    [HttpPost("skills")]
    public async Task<ActionResult<ProfileSkillResponse>> AddOrUpdateSkill(
        ProfileSkillRequest request,
        CancellationToken cancellationToken)
    {
        var skillValidationError = ValidateSkillRequest(request);
        if (skillValidationError is not null)
        {
            return BadRequest(new { message = skillValidationError });
        }

        var profile = await GetOrCreateProfileAsync(User.GetRequiredUserId(), cancellationToken);
        var skill = await GetOrCreateSkillAsync(request, cancellationToken);
        if (skill is null)
        {
            return NotFound(new { message = "Skill was not found." });
        }

        var volunteerSkill = await _dbContext.VolunteerSkills
            .Include(entity => entity.Skill)
            .FirstOrDefaultAsync(
                entity => entity.VolunteerProfileId == profile.Id && entity.SkillId == skill.Id,
                cancellationToken);

        if (volunteerSkill is null)
        {
            volunteerSkill = new VolunteerSkill
            {
                VolunteerProfileId = profile.Id,
                SkillId = skill.Id,
                Skill = skill
            };
            _dbContext.VolunteerSkills.Add(volunteerSkill);
        }

        volunteerSkill.YearsOfExperience = request.YearsOfExperience;
        volunteerSkill.Note = NormalizeOptional(request.VerificationNote) ?? NormalizeOptional(request.Note);
        if (!string.IsNullOrWhiteSpace(request.EvidenceUrl) || !string.IsNullOrWhiteSpace(request.VerificationNote))
        {
            volunteerSkill.VerificationStatus = "Pending";
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        volunteerSkill.Skill = skill;

        return Ok(ToProfileSkillResponse(volunteerSkill));
    }

    [HttpPut("skills/{skillId:int}/verification")]
    public async Task<ActionResult<ProfileSkillResponse>> SubmitSkillVerification(
        int skillId,
        ProfileSkillRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var volunteerSkill = await _dbContext.VolunteerSkills
            .Include(entity => entity.Skill)
            .Include(entity => entity.VolunteerProfile)
            .FirstOrDefaultAsync(
                entity => entity.VolunteerProfile.UserId == userId && entity.SkillId == skillId,
                cancellationToken);

        if (volunteerSkill is null)
        {
            return NotFound(new { message = "Skill was not found on this profile." });
        }

        volunteerSkill.Note = NormalizeOptional(request.VerificationNote) ?? NormalizeOptional(request.Note) ?? volunteerSkill.Note;
        volunteerSkill.VerificationStatus = "Pending";

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToProfileSkillResponse(volunteerSkill));
    }

    [HttpDelete("skills/{skillId:int}")]
    public async Task<IActionResult> DeleteSkill(int skillId, CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var volunteerSkill = await _dbContext.VolunteerSkills
            .Include(entity => entity.VolunteerProfile)
            .FirstOrDefaultAsync(
                entity => entity.VolunteerProfile.UserId == userId && entity.SkillId == skillId,
                cancellationToken);

        if (volunteerSkill is null)
        {
            return NotFound(new { message = "Skill was not found on this profile." });
        }

        _dbContext.VolunteerSkills.Remove(volunteerSkill);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("kyc")]
    public async Task<ActionResult<KycSubmissionResponse>> SubmitKyc(KycSubmitRequest request, CancellationToken cancellationToken)
    {
        var kycValidationError = ValidateKycRequest(request);
        if (kycValidationError is not null)
        {
            return BadRequest(new { message = kycValidationError });
        }

        var userId = User.GetRequiredUserId();
        var user = await _dbContext.Users.FirstOrDefaultAsync(entity => entity.Id == userId, cancellationToken);
        var profile = await GetOrCreateProfileAsync(userId, cancellationToken);
        var hasPendingSubmission = await _dbContext.KycSubmissions.AnyAsync(
            submission => submission.VolunteerProfileId == profile.Id && submission.Status == "Pending",
            cancellationToken);

        if (hasPendingSubmission && !request.ConfirmReverify)
        {
            return Conflict(new { message = "A pending KYC submission already exists." });
        }

        var legalFullName = NormalizeOptional(request.LegalFullName) ?? user?.FullName ?? $"Volunteer #{userId}";
        var identityNumber = NormalizeOptional(request.IdentityNumber) ?? $"KYC-{userId}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        var documentFrontUrl = NormalizeOptional(request.DocumentFrontUrl) ?? NormalizeOptional(request.IdentityFrontImageUrl);
        var documentBackUrl = NormalizeOptional(request.DocumentBackUrl) ?? NormalizeOptional(request.IdentityBackImageUrl);

        var submission = new KycSubmission
        {
            VolunteerProfileId = profile.Id,
            LegalFullName = legalFullName,
            IdentityNumber = identityNumber,
            DocumentFrontUrl = documentFrontUrl,
            DocumentBackUrl = documentBackUrl,
            Status = "Pending"
        };

        profile.KycStatus = "Pending";
        profile.UpdatedAt = DateTime.UtcNow;

        _dbContext.KycSubmissions.Add(submission);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToKycSubmissionResponse(submission));
    }

    [HttpGet("passport")]
    public async Task<IActionResult> GetPassport(CancellationToken cancellationToken)
    {
        var profile = await LoadProfileAsync(User.GetRequiredUserId(), cancellationToken);
        if (profile is null)
        {
            return Ok(new
            {
                totalHours = 0,
                totalEvents = 0,
                totalCertificates = 0,
                recentActivities = Array.Empty<object>()
            });
        }

        return Ok(new
        {
            profile.UserId,
            profileId = profile.Id,
            totalHours = 0,
            totalEvents = 0,
            totalCertificates = 0,
            verifiedSkills = profile.VolunteerSkills.Count(skill => skill.VerificationStatus == "Verified"),
            kycStatus = profile.KycStatus,
            recentActivities = Array.Empty<object>()
        });
    }

    private async Task<VolunteerProfile> GetOrCreateProfileAsync(int userId, CancellationToken cancellationToken)
    {
        var profile = await _dbContext.VolunteerProfiles.FirstOrDefaultAsync(entity => entity.UserId == userId, cancellationToken);
        if (profile is not null)
        {
            return profile;
        }

        profile = new VolunteerProfile { UserId = userId };
        _dbContext.VolunteerProfiles.Add(profile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return profile;
    }

    private async Task<Skill?> GetOrCreateSkillAsync(ProfileSkillRequest request, CancellationToken cancellationToken)
    {
        if (request.SkillId is not null)
        {
            return await _dbContext.Skills.FirstOrDefaultAsync(skill => skill.Id == request.SkillId, cancellationToken);
        }

        var normalizedName = request.Name!.Trim();
        var skill = await _dbContext.Skills.FirstOrDefaultAsync(entity => entity.Name == normalizedName, cancellationToken);
        if (skill is not null)
        {
            return skill;
        }

        skill = new Skill
        {
            Name = normalizedName,
            Description = NormalizeOptional(request.Description)
        };
        _dbContext.Skills.Add(skill);

        return skill;
    }

    private Task<VolunteerProfile?> LoadProfileAsync(int userId, CancellationToken cancellationToken)
    {
        return _dbContext.VolunteerProfiles
            .Include(profile => profile.VolunteerSkills)
                .ThenInclude(volunteerSkill => volunteerSkill.Skill)
            .Include(profile => profile.KycSubmissions.OrderByDescending(submission => submission.SubmittedAt))
            .FirstOrDefaultAsync(profile => profile.UserId == userId, cancellationToken);
    }

    private static void ApplyProfileRequest(VolunteerProfile profile, ProfileUpsertRequest request)
    {
        profile.PhoneNumber = NormalizeOptional(request.PhoneNumber);
        profile.DateOfBirth = request.DateOfBirth;
        profile.Gender = NormalizeOptional(request.Gender);
        profile.Address = NormalizeOptional(request.Address);
        profile.Bio = NormalizeOptional(request.Bio);
        profile.AvatarUrl = NormalizeOptional(request.AvatarUrl);
    }

    private static string? ValidateProfileRequest(ProfileUpsertRequest request)
    {
        var phone = NormalizeOptional(request.PhoneNumber);
        if (phone is not null && !PhoneRegex.IsMatch(phone))
        {
            return "Phone number must contain 9-15 digits and may start with '+'.";
        }

        if (request.DateOfBirth is { } dateOfBirth)
        {
            if (dateOfBirth > DateTime.UtcNow.Date)
            {
                return "Date of birth must be in the past.";
            }

            if (dateOfBirth.Year < 1900)
            {
                return "Date of birth must be after 1900.";
            }
        }

        var gender = NormalizeOptional(request.Gender);
        if (gender is not null && !AllowedGenders.Contains(gender))
        {
            return "Gender must be Male, Female, or Other.";
        }

        var bio = NormalizeOptional(request.Bio);
        if (bio is not null && bio.Length > BioMaxLength)
        {
            return $"Bio must not exceed {BioMaxLength} characters.";
        }

        var address = NormalizeOptional(request.Address);
        if (address is not null && address.Length > AddressMaxLength)
        {
            return $"Address must not exceed {AddressMaxLength} characters.";
        }

        var avatarUrl = NormalizeOptional(request.AvatarUrl);
        if (avatarUrl is not null && !IsValidHttpUrl(avatarUrl))
        {
            return "Avatar URL must be a valid http(s) URL.";
        }

        return null;
    }

    private static string? ValidateKycRequest(KycSubmitRequest request)
    {
        var legalFullName = NormalizeOptional(request.LegalFullName);
        if (legalFullName is not null && legalFullName.Length > 100)
        {
            return "Legal full name must not exceed 100 characters.";
        }

        var identityNumber = NormalizeOptional(request.IdentityNumber);
        if (identityNumber is not null && !IdentityNumberRegex.IsMatch(identityNumber))
        {
            return "Identity number must contain 9-12 digits.";
        }

        foreach (var url in new[]
                 {
                     NormalizeOptional(request.DocumentFrontUrl),
                     NormalizeOptional(request.DocumentBackUrl),
                     NormalizeOptional(request.IdentityFrontImageUrl),
                     NormalizeOptional(request.IdentityBackImageUrl),
                     NormalizeOptional(request.PortraitImageUrl)
                 })
        {
            if (url is not null && !IsValidHttpUrl(url))
            {
                return "KYC document URLs must be valid http(s) URLs.";
            }
        }

        return null;
    }

    private static bool IsValidHttpUrl(string value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static string? ValidateSkillRequest(ProfileSkillRequest request)
    {
        if (request.SkillId is null && string.IsNullOrWhiteSpace(request.Name))
        {
            return "SkillId or Name is required.";
        }

        if (request.SkillId is not null && !string.IsNullOrWhiteSpace(request.Name))
        {
            return "Use either SkillId or Name, not both.";
        }

        if (request.YearsOfExperience < 0)
        {
            return "YearsOfExperience cannot be negative.";
        }

        return null;
    }

    private static ProfileResponse ToProfileResponse(VolunteerProfile profile)
    {
        return new ProfileResponse(
            profile.Id,
            profile.UserId,
            profile.PhoneNumber,
            profile.DateOfBirth,
            profile.Gender,
            profile.Address,
            profile.Bio,
            profile.AvatarUrl,
            profile.KycStatus,
            profile.CreatedAt,
            profile.UpdatedAt,
            profile.VolunteerSkills.Select(ToProfileSkillResponse).ToArray(),
            profile.KycSubmissions.Select(ToKycSubmissionResponse).ToArray());
    }

    private static ProfileSkillResponse ToProfileSkillResponse(VolunteerSkill volunteerSkill)
    {
        return new ProfileSkillResponse(
            volunteerSkill.SkillId,
            volunteerSkill.Skill.Name,
            volunteerSkill.Skill.Description,
            volunteerSkill.YearsOfExperience,
            volunteerSkill.Note,
            volunteerSkill.VerificationStatus,
            volunteerSkill.YearsOfExperience is null ? null : $"{volunteerSkill.YearsOfExperience} năm",
            null,
            volunteerSkill.Note);
    }

    private static KycSubmissionResponse ToKycSubmissionResponse(KycSubmission submission)
    {
        return new KycSubmissionResponse(
            submission.Id,
            submission.LegalFullName,
            submission.IdentityNumber,
            submission.DocumentFrontUrl,
            submission.DocumentBackUrl,
            submission.Status,
            submission.ReviewNote,
            submission.SubmittedAt,
            submission.ReviewedAt);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
