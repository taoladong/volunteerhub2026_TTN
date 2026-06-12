using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = "Admin")]
    public class AdminUsersController : ControllerBase
    {
        private readonly MySqlDbContext _dbContext;

        public AdminUsersController(MySqlDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 100, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var lowerSearch = search.ToLower();
                query = query.Where(u =>
                    (u.Name != null && u.Name.ToLower().Contains(lowerSearch)) ||
                    (u.Email != null && u.Email.ToLower().Contains(lowerSearch)) ||
                    (u.UserName != null && u.UserName.ToLower().Contains(lowerSearch))
                );
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var users = await query
                .OrderByDescending(u => u.Created)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    Id = u.Id,
                    FullName = u.Name,
                    Email = u.Email,
                    Role = u.UserType == 1 ? "Organizer" :
                           u.UserType == 2 ? "Sponsor" :
                           u.UserType == 3 ? "Admin" : "Volunteer",
                    IsActive = u.IsActive
                })
                .ToListAsync(cancellationToken);

            return Ok(new
            {
                TotalCount = totalCount,
                Items = users
            });
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(int id, CancellationToken cancellationToken)
        {
            var user = await _dbContext.Users.FindAsync(new object[] { id }, cancellationToken);
            if (user == null)
            {
                return NotFound();
            }

            user.IsActive = !user.IsActive;
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new { message = "User status updated", isActive = user.IsActive });
        }
    }
}
