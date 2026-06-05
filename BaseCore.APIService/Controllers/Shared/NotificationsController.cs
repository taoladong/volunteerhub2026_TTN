using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.Services.VolunteerHub;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/notifications")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var (items, totalCount) = await _notificationService.GetByUserAsync(userId, page, pageSize);
            return Ok(new { items, totalCount, page, pageSize, totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            await _notificationService.MarkReadAsync(id, userId);
            return Ok(new { message = "Marked as read" });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();
            await _notificationService.MarkAllReadAsync(userId);
            return Ok(new { message = "All marked as read" });
        }
    }
}
