using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Controllers
{
    [Route("api/users/volunteers")]
    [ApiController]
    [Authorize(Roles = "Organizer,Admin")]
    public class VolunteerLookupController : ControllerBase
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;

        public VolunteerLookupController(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        public async Task<IActionResult> GetVolunteers([FromQuery] string? keyword, [FromQuery] int take = 50)
        {
            take = Math.Clamp(take, 1, 100);

            var query = _unitOfWork.Users.GetQueryable()
                .AsNoTracking()
                .Where(u => u.UserType == 0 && u.IsActive);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                query = query.Where(u =>
                    u.UserName.Contains(keyword) ||
                    u.Name.Contains(keyword) ||
                    u.Email.Contains(keyword));
            }

            var volunteers = await query
                .OrderBy(u => u.Name)
                .ThenBy(u => u.UserName)
                .Take(take)
                .Select(u => new
                {
                    u.Id,
                    u.UserName,
                    u.Name,
                    u.Email,
                    profile = _unitOfWork.VolunteerProfiles.GetQueryable()
                        .Where(p => p.UserId == u.Id)
                        .Select(p => new
                        {
                            p.KycStatus,
                            p.TotalVolunteerHours
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(volunteers);
        }
    }
}






