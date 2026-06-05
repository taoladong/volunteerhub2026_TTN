using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class BadgesController : ControllerBase
    {
        private readonly IBadgeService _badgeService;

        public BadgesController(IBadgeService badgeService)
        {
            _badgeService = badgeService;
        }

        [HttpGet("api/badges")]
        public async Task<IActionResult> GetAll() => Ok(await _badgeService.GetAllAsync());

        [HttpGet("api/my-badges"), Authorize]
        public async Task<IActionResult> GetMyBadges()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            var badges = await _badgeService.GetByUserAsync(userId);
            return Ok(badges);
        }
    }
}





