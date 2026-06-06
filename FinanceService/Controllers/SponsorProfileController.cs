using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Entities;
using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/sponsor/profile")]
    [ApiController]
    [Authorize(Roles = "Sponsor")]
    public class SponsorProfileController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public SponsorProfileController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var profile = await _context.SponsorProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                // Auto-create empty profile
                profile = new SponsorProfile
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.SponsorProfiles.Add(profile);
                await _context.SaveChangesAsync();
            }

            return Ok(profile);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] SponsorProfileUpdateDto dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var organizationName = dto.OrganizationName?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(organizationName))
                return BadRequest(new { message = "Organization name is required" });
            if (organizationName.Length > 200)
                return BadRequest(new { message = "Organization name cannot exceed 200 characters" });
            if (!string.IsNullOrWhiteSpace(dto.ContactEmail) && (!dto.ContactEmail.Contains('@') || dto.ContactEmail.Length > 254))
                return BadRequest(new { message = "Contact email is invalid" });
            if (!string.IsNullOrWhiteSpace(dto.Phone) && dto.Phone.Trim().Length > 30)
                return BadRequest(new { message = "Phone number cannot exceed 30 characters" });
            if (!string.IsNullOrWhiteSpace(dto.Website) && dto.Website.Trim().Length > 300)
                return BadRequest(new { message = "Website cannot exceed 300 characters" });
            if (!string.IsNullOrWhiteSpace(dto.LogoUrl) && dto.LogoUrl.Trim().Length > 500)
                return BadRequest(new { message = "Logo URL cannot exceed 500 characters" });
            if (!string.IsNullOrWhiteSpace(dto.Description) && dto.Description.Trim().Length > 2000)
                return BadRequest(new { message = "Description cannot exceed 2000 characters" });

            var profile = await _context.SponsorProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                profile = new SponsorProfile
                {
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.SponsorProfiles.Add(profile);
            }

            profile.OrganizationName = organizationName;
            profile.RepresentativeName = dto.RepresentativeName?.Trim() ?? "";
            profile.ContactEmail = dto.ContactEmail?.Trim() ?? "";
            profile.Phone = dto.Phone?.Trim() ?? "";
            profile.Website = dto.Website?.Trim() ?? "";
            profile.LogoUrl = dto.LogoUrl?.Trim() ?? "";
            profile.Description = dto.Description?.Trim() ?? "";
            profile.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(profile);
        }
    }

    public class SponsorProfileUpdateDto
    {
        public string? OrganizationName { get; set; }
        public string? RepresentativeName { get; set; }
        public string? ContactEmail { get; set; }
        public string? Phone { get; set; }
        public string? Website { get; set; }
        public string? LogoUrl { get; set; }
        public string? Description { get; set; }
    }
}
