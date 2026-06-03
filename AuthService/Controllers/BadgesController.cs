using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
public class BadgesController : ControllerBase
{
    [HttpGet("api/badges")]
    public IActionResult GetAll()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpGet("api/my-badges")]
    public IActionResult GetMine()
    {
        return Ok(Array.Empty<object>());
    }
}
