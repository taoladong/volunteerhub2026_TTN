using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.VolunteerHub;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/event-categories")]
    [ApiController]
    public class EventCategoriesController : ControllerBase
    {
        private readonly IEventCategoryRepositoryEF _repo;
        private readonly IAuditLogService _auditLogService;
        public EventCategoriesController(IEventCategoryRepositoryEF repo, IAuditLogService auditLogService)
        {
            _repo = repo;
            _auditLogService = auditLogService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _repo.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _repo.GetByIdAsync(id);
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost, Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Create([FromBody] EventCategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Category name is required" });
            if (dto.Name.Trim().Length > 100)
                return BadRequest(new { message = "Category name must be 100 characters or less" });
            if ((dto.Description?.Length ?? 0) > 500)
                return BadRequest(new { message = "Category description must be 500 characters or less" });

            var cat = new EventCategory
            {
                Name = dto.Name.Trim(),
                Description = dto.Description ?? "",
                Icon = dto.Icon ?? ""
            };
            await _repo.AddAsync(cat);
            await RecordAuditAsync("EventCategory.Create", "EventCategory", cat.Id, $"Name={cat.Name}");
            return CreatedAtAction(nameof(GetById), new { id = cat.Id }, cat);
        }

        [HttpPut("{id}"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Update(int id, [FromBody] EventCategoryDto dto)
        {
            var cat = await _repo.GetByIdAsync(id);
            if (cat == null) return NotFound();
            if (dto.Name != null && string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Category name cannot be empty" });
            if ((dto.Name?.Trim().Length ?? 0) > 100)
                return BadRequest(new { message = "Category name must be 100 characters or less" });
            if ((dto.Description?.Length ?? 0) > 500)
                return BadRequest(new { message = "Category description must be 500 characters or less" });

            cat.Name = dto.Name?.Trim() ?? cat.Name;
            cat.Description = dto.Description ?? cat.Description;
            cat.Icon = dto.Icon ?? cat.Icon;
            await _repo.UpdateAsync(cat);
            await RecordAuditAsync("EventCategory.Update", "EventCategory", cat.Id, $"Name={cat.Name}");
            return Ok(cat);
        }

        [HttpDelete("{id}"), Authorize(Roles = "Admin")]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> Delete(int id)
        {
            var cat = await _repo.GetByIdAsync(id);
            if (cat == null) return NotFound();
            try
            {
                await _repo.DeleteAsync(cat);
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Cannot delete a category that is used by events" });
            }
            await RecordAuditAsync("EventCategory.Delete", "EventCategory", id);
            return Ok(new { message = "Deleted" });
        }

        private Task RecordAuditAsync(string action, string entityType, int? entityId = null, string? metadata = null)
        {
            var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsedUserId)
                ? parsedUserId
                : (int?)null;

            return _auditLogService.RecordAsync(
                userId,
                action,
                entityType,
                entityId,
                metadata,
                HttpContext.Connection.RemoteIpAddress?.ToString());
        }
    }

    public class EventCategoryDto
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string? Icon { get; set; }
    }
}
