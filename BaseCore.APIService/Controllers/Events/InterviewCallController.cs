using System.IO.Compression;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    public class InterviewCallController : ControllerBase
    {
        private readonly MySqlDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public InterviewCallController(MySqlDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet("api/interviews/{slotId}/trtc-token"), Authorize(Roles = "Organizer,Volunteer")]
        [EnableRateLimiting("read-sensitive")]
        public async Task<IActionResult> GetTrtcToken(int slotId)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return Unauthorized();

            var slot = await _context.InterviewSlots
                .Include(s => s.Event)
                .Include(s => s.Registration)
                    .ThenInclude(r => r.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == slotId);

            if (slot == null) return NotFound(new { message = "Interview slot not found" });
            if (slot.Status != "Scheduled")
                return BadRequest(new { message = "Interview room is not active" });
            if (slot.Event == null || slot.Registration == null)
                return BadRequest(new { message = "Interview data is incomplete" });

            var isOrganizer = slot.Event.OrganizerId == userId;
            var isVolunteer = slot.Registration.UserId == userId;
            if (!isOrganizer && !isVolunteer) return Forbid();

            var sdkAppId = _configuration.GetValue<int?>("TRTC:SdkAppId")
                ?? _configuration.GetValue<int?>("TRTC:SDKAppID")
                ?? 0;
            var secretKey = _configuration["TRTC:SDKSecretKey"]
                ?? _configuration["TRTC:SecretKey"]
                ?? Environment.GetEnvironmentVariable("TRTC__SDK_SECRET_KEY")
                ?? Environment.GetEnvironmentVariable("TRTC_SDK_SECRET_KEY");
            var expiresIn = _configuration.GetValue<int?>("TRTC:UserSigExpireSeconds") ?? 86400;

            if (sdkAppId <= 0 || string.IsNullOrWhiteSpace(secretKey))
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "TRTC is not configured" });

            var selfUserId = BuildTrtcUserId(userId);
            var peerUserId = BuildTrtcUserId(isOrganizer ? slot.Registration.UserId : slot.Event.OrganizerId);
            var selfName = isOrganizer
                ? "Nhà tổ chức"
                : slot.Registration.User?.Name ?? slot.Registration.User?.UserName ?? "Tình nguyện viên";

            var importResult = await EnsureTrtcUsersAsync(sdkAppId, secretKey, selfUserId, peerUserId);
            return Ok(new
            {
                sdkAppId,
                userId = selfUserId,
                userSig = GenerateUserSig(sdkAppId, secretKey, selfUserId, expiresIn),
                peerUserId,
                canStartCall = isOrganizer,
                role = isOrganizer ? "Organizer" : "Volunteer",
                roomId = BuildTrtcRoomId(slot.Id),
                expiresIn,
                selfName,
                scheduledAt = slot.ScheduledAt,
                durationMinutes = slot.DurationMinutes,
                eventTitle = slot.Event.Title,
                importWarning = importResult.Success ? null : importResult.Error
            });
        }

        private static string BuildTrtcUserId(int userId) => $"user{userId}";

        private static int BuildTrtcRoomId(int slotId)
        {
            return 100_000_000 + slotId;
        }

        private async Task<(bool Success, string? Error)> EnsureTrtcUsersAsync(int sdkAppId, string secretKey, params string[] userIds)
        {
            foreach (var trtcUserId in userIds.Distinct(StringComparer.Ordinal))
            {
                var result = await ImportTrtcUserAsync(sdkAppId, secretKey, trtcUserId);
                if (!result.Success) return result;
            }

            return (true, null);
        }

        private async Task<(bool Success, string? Error)> ImportTrtcUserAsync(int sdkAppId, string secretKey, string trtcUserId)
        {
            var adminUserSig = GenerateUserSig(sdkAppId, secretKey, "administrator", 86400);
            var hosts = GetTrtcRestApiHosts();
            var errors = new List<string>();

            foreach (var host in hosts)
            {
                var random = RandomNumberGenerator.GetInt32(100_000, 999_999_999);
                var url =
                    $"https://{host}/v4/im_open_login_svc/account_import" +
                    $"?sdkappid={sdkAppId}" +
                    $"&identifier=administrator" +
                    $"&usersig={Uri.EscapeDataString(adminUserSig)}" +
                    $"&random={random}" +
                    $"&contenttype=json";

                try
                {
                    var httpClient = _httpClientFactory.CreateClient();
                    var response = await httpClient.PostAsJsonAsync(url, new
                    {
                        UserID = trtcUserId,
                        Nick = trtcUserId
                    });
                    var body = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        errors.Add($"{host}: HTTP {(int)response.StatusCode}: {body}");
                        continue;
                    }

                    using var json = JsonDocument.Parse(body);
                    var root = json.RootElement;
                    var errorCode = root.TryGetProperty("ErrorCode", out var codeElement)
                        ? codeElement.GetInt32()
                        : -1;
                    if (errorCode == 0) return (true, null);

                    var errorInfo = root.TryGetProperty("ErrorInfo", out var infoElement)
                        ? infoElement.GetString()
                        : body;
                    errors.Add($"{host}: ErrorCode={errorCode}: {errorInfo}");
                }
                catch (Exception ex)
                {
                    errors.Add($"{host}: {ex.Message}");
                }
            }

            return (false, string.Join(" | ", errors));
        }

        private IReadOnlyList<string> GetTrtcRestApiHosts()
        {
            var configuredHost = _configuration["TRTC:RestApiHost"];
            var hosts = new[]
            {
                configuredHost,
                "adminapisgp.im.qcloud.com",
                "console.tim.qq.com",
                "adminapikr.im.qcloud.com",
                "adminapijpn.im.qcloud.com",
                "adminapiger.im.qcloud.com",
                "adminapiusa.im.qcloud.com",
                "adminapiidn.im.qcloud.com"
            };

            return hosts
                .Where(h => !string.IsNullOrWhiteSpace(h))
                .Select(h => h!.Trim().Replace("https://", "").Replace("http://", "").TrimEnd('/'))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static string GenerateUserSig(int sdkAppId, string secretKey, string userId, int expiresInSeconds)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var signContent = new StringBuilder()
                .Append("TLS.identifier:").Append(userId).Append('\n')
                .Append("TLS.sdkappid:").Append(sdkAppId).Append('\n')
                .Append("TLS.time:").Append(now).Append('\n')
                .Append("TLS.expire:").Append(expiresInSeconds).Append('\n')
                .ToString();

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
            var signature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(signContent)));

            var payload = new Dictionary<string, object>
            {
                ["TLS.ver"] = "2.0",
                ["TLS.identifier"] = userId,
                ["TLS.sdkappid"] = sdkAppId,
                ["TLS.time"] = now,
                ["TLS.expire"] = expiresInSeconds,
                ["TLS.sig"] = signature
            };

            var json = JsonSerializer.Serialize(payload);
            var bytes = Encoding.UTF8.GetBytes(json);
            using var output = new MemoryStream();
            using (var zlib = new ZLibStream(output, CompressionLevel.SmallestSize, leaveOpen: true))
            {
                zlib.Write(bytes, 0, bytes.Length);
            }

            return EscapeBase64(Convert.ToBase64String(output.ToArray()));
        }

        private static string EscapeBase64(string value)
        {
            return value.Replace('+', '*').Replace('/', '-').Replace('=', '_');
        }
    }
}
