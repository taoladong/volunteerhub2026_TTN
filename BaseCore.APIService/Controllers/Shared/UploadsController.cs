using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/uploads")]
    [ApiController]
    public class UploadsController : ControllerBase
    {
        private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp", ".gif"
        };

        private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/webp", "image/gif"
        };

        private const long MaxImageBytes = 5 * 1024 * 1024;
        private const long MaxFileBytes = 10 * 1024 * 1024;

        private static readonly HashSet<string> AllowedFileExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".docx", ".doc", ".xlsx", ".jpg", ".jpeg", ".png", ".webp", ".gif"
        };

        [HttpPost("images")]
        [Authorize]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn ảnh để upload." });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { message = "Ảnh không được vượt quá 5MB." });

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedImageExtensions.Contains(extension) || !AllowedImageContentTypes.Contains(file.ContentType))
                return BadRequest(new { message = "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF." });

            if (!await HasValidMagicBytesAsync(file, extension))
                return BadRequest(new { message = "Nội dung file ảnh không khớp định dạng." });

            var uploadRoot = GetUploadRoot();
            Directory.CreateDirectory(uploadRoot);

            var ownerId = CurrentUserId() ?? 0;
            var fileName = $"u{ownerId}-{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var path = Path.Combine(uploadRoot, fileName);

            await using (var stream = System.IO.File.Create(path))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new
            {
                fileName,
                uploadedBy = ownerId,
                url = Url.Action(nameof(GetImage), new { fileName }) ?? $"/api/uploads/images/{fileName}"
            });
        }

        [HttpGet("images/{fileName}")]
        [AllowAnonymous]
        [EnableRateLimiting("read-sensitive")]
        public IActionResult GetImage(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName))
                return BadRequest(new { message = "Invalid file name" });

            var path = Path.Combine(GetUploadRoot(), fileName);
            if (!System.IO.File.Exists(path))
                return NotFound(new { message = "Image not found" });

            var extension = Path.GetExtension(fileName);
            var contentType = extension.ToLowerInvariant() switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };

            return PhysicalFile(path, contentType);
        }

        [HttpPost("file")]
        [Authorize]
        [EnableRateLimiting("write-sensitive")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "File trong" });
            if (file.Length > MaxFileBytes)
                return BadRequest(new { message = "File khong duoc vuot qua 10MB" });

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedFileExtensions.Contains(extension))
                return BadRequest(new { message = "Dinh dang file khong ho tro" });
            if (!await HasValidMagicBytesAsync(file, extension))
                return BadRequest(new { message = "Noi dung file khong khop dinh dang" });

            var uploadRoot = GetFileUploadRoot();
            Directory.CreateDirectory(uploadRoot);

            var ownerId = CurrentUserId() ?? 0;
            var fileName = $"u{ownerId}-{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var path = Path.Combine(uploadRoot, fileName);

            await using (var stream = System.IO.File.Create(path))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new
            {
                url = Url.Action(nameof(GetFile), new { fileName }) ?? $"/api/uploads/files/{fileName}",
                name = file.FileName,
                size = file.Length,
                uploadedBy = ownerId,
                type = extension.TrimStart('.').ToLowerInvariant()
            });
        }

        [HttpGet("files/{fileName}")]
        [AllowAnonymous]
        [EnableRateLimiting("read-sensitive")]
        public IActionResult GetFile(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName))
                return BadRequest(new { message = "Invalid file name" });

            var path = Path.Combine(GetFileUploadRoot(), fileName);
            if (!System.IO.File.Exists(path))
                return NotFound(new { message = "File not found" });

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc" => "application/msword",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };

            return PhysicalFile(path, contentType, fileName);
        }

        private static string GetUploadRoot()
        {
            return Path.Combine(AppContext.BaseDirectory, "wwwroot", "uploads", "images");
        }

        private static string GetFileUploadRoot()
        {
            return Path.Combine(AppContext.BaseDirectory, "wwwroot", "uploads", "files");
        }

        private int? CurrentUserId()
        {
            return int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId)
                ? userId
                : null;
        }

        private static async Task<bool> HasValidMagicBytesAsync(IFormFile file, string extension)
        {
            var header = new byte[Math.Min(16, (int)file.Length)];
            await using var stream = file.OpenReadStream();
            var read = await stream.ReadAsync(header.AsMemory(0, header.Length));
            if (read < 4) return false;

            extension = extension.ToLowerInvariant();
            return extension switch
            {
                ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => read >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                          header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
                ".gif" => header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38,
                ".webp" => read >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                           header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
                ".pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
                ".docx" or ".xlsx" => header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
                ".doc" => header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0,
                _ => false
            };
        }
    }
}
