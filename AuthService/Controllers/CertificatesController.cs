using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
[Route("api/certificates")]
public class CertificatesController : ControllerBase
{
    [HttpGet]
    public IActionResult GetMine()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpGet("{code}")]
    [AllowAnonymous]
    public IActionResult Verify(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { message = "Certificate code is required." });
        }

        return NotFound(new { message = "Certificate was not found." });
    }

    [HttpGet("{code}/pdf")]
    [AllowAnonymous]
    public IActionResult GetPdf(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { message = "Certificate code is required." });
        }

        return NotFound(new { message = "Certificate PDF was not found." });
    }
}
