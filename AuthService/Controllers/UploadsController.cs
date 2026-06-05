using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers;

[ApiController]
[Authorize]
[Route("api/uploads")]
public class UploadsController : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    private readonly IWebHostEnvironment _environment;

    public UploadsController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost("images")]
    public Task<IActionResult> UploadImage([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        return SaveFileAsync(file, onlyImages: true, cancellationToken);
    }

    [HttpPost("file")]
    public Task<IActionResult> UploadFile([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        return SaveFileAsync(file, onlyImages: false, cancellationToken);
    }

    private async Task<IActionResult> SaveFileAsync(IFormFile file, bool onlyImages, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "File is required." });
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            return BadRequest(new { message = "File extension is required." });
        }

        if (onlyImages && !AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only image files are allowed." });
        }

        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var uploadFolder = Path.Combine(webRootPath, "uploads");
        Directory.CreateDirectory(uploadFolder);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var physicalPath = Path.Combine(uploadFolder, fileName);

        await using (var stream = System.IO.File.Create(physicalPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var url = $"/uploads/{fileName}";
        return Ok(new { url, fileUrl = url, path = url });
    }
}
