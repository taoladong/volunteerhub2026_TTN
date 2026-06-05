using BaseCore.Common;
using BaseCore.Entities;
using BaseCore.Services.Authen;
using BaseCore.Services.VolunteerHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Net.Mail;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IRefreshTokenService _refreshTokenService;
        private readonly IAuditLogService _auditLogService;
        private readonly IConfiguration _configuration;
        private const int TokenExpirationMinutes = 480;

        public AuthController(
            IUserService userService,
            IRefreshTokenService refreshTokenService,
            IAuditLogService auditLogService,
            IConfiguration configuration)
        {
            _userService = userService;
            _refreshTokenService = refreshTokenService;
            _auditLogService = auditLogService;
            _configuration = configuration;
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth-sensitive")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username/email and password are required" });
            }

            var identifier = request.Username ?? request.Email;
            if (string.IsNullOrWhiteSpace(identifier))
            {
                return BadRequest(new { message = "Username/email and password are required" });
            }

            var user = await _userService.AuthenticateByUsernameOrEmail(identifier, request.Password);
            if (user == null)
            {
                await RecordAuditAsync(null, "Auth.LoginFailed", "User", null, $"Identifier={MaskIdentifier(identifier)}");
                return Unauthorized(new { message = "Invalid username/email or password" });
            }

            var response = await CreateAuthResponseAsync(user);
            await RecordAuditAsync(user.Id, "Auth.Login", "User", user.Id);
            return Ok(response);
        }

        [HttpPost("register")]
        [EnableRateLimiting("auth-sensitive")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request" });
            }

            var username = ResolveUsername(request);
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required" });
            }

            var validation = await ValidateRegisterRequestAsync(request, username);
            if (validation != null)
            {
                return BadRequest(new { message = validation });
            }

            var userType = ResolveUserType(request);
            var displayName = ResolveDisplayName(request, username);

            try
            {
                var user = new User
                {
                    UserName = username,
                    Name = displayName,
                    Email = request.Email?.Trim() ?? "",
                    Phone = request.Phone?.Trim() ?? "",
                    UserType = userType
                };

                var createdUser = await _userService.Create(user, request.Password);
                await RecordAuditAsync(createdUser.Id, "Auth.Register", "User", createdUser.Id, $"Role={MapRole(createdUser.UserType)}");

                return Ok(new
                {
                    message = "Registration successful",
                    user = MapUserResponse(createdUser)
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Registration failed: " + ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                return Unauthorized();
            }

            var user = await _userService.GetById(userId);
            if (user == null || !user.IsActive)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(MapUserResponse(user));
        }

        [HttpPost("refresh")]
        [EnableRateLimiting("auth-sensitive")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RefreshToken))
            {
                return BadRequest(new { message = "Refresh token is required" });
            }

            var currentToken = await _refreshTokenService.GetActiveTokenAsync(request.RefreshToken);
            if (currentToken == null || !currentToken.User.IsActive)
            {
                return Unauthorized(new { message = "Refresh token is invalid or expired" });
            }

            var user = await _userService.GetById(currentToken.UserId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { message = "User is no longer active" });
            }

            return Ok(await CreateAuthResponseAsync(user, currentToken));
        }

        [HttpPost("change-password")]
        [Authorize]
        [EnableRateLimiting("auth-sensitive")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "Current password and new password are required" });
            }

            if (request.NewPassword.Length < 8)
            {
                return BadRequest(new { message = "New password must be at least 8 characters" });
            }

            if (!string.IsNullOrWhiteSpace(request.ConfirmNewPassword) &&
                request.NewPassword != request.ConfirmNewPassword)
            {
                return BadRequest(new { message = "New password and confirm password do not match" });
            }

            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                return Unauthorized();
            }

            var user = await _userService.GetById(userId);
            if (user == null || !user.IsActive)
            {
                return NotFound(new { message = "User not found" });
            }

            var verified = await _userService.AuthenticateByUsernameOrEmail(user.UserName, request.CurrentPassword);
            if (verified == null)
            {
                return BadRequest(new { message = "Current password is incorrect" });
            }

            await _userService.Update(user, request.NewPassword);
            await RecordAuditAsync(user.Id, "Auth.ChangePassword", "User", user.Id);
            return Ok(new { message = "Password changed successfully" });
        }

        [HttpPost("logout")]
        [Authorize]
        [EnableRateLimiting("auth-sensitive")]
        public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request)
        {
            if (!string.IsNullOrWhiteSpace(request?.RefreshToken))
            {
                await _refreshTokenService.RevokeAsync(request.RefreshToken);
            }

            var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userId = int.TryParse(userIdValue, out var parsedUserId) ? parsedUserId : (int?)null;
            await RecordAuditAsync(userId, "Auth.Logout", "User", userId);
            return Ok(new { message = "Logout successful" });
        }

        private Task RecordAuditAsync(int? userId, string action, string entityType, int? entityId = null, string? metadata = null)
        {
            return _auditLogService.RecordAsync(
                userId,
                action,
                entityType,
                entityId,
                metadata,
                HttpContext.Connection.RemoteIpAddress?.ToString());
        }

        private static string MaskIdentifier(string identifier)
        {
            var trimmed = identifier.Trim();
            if (trimmed.Length <= 3) return "***";
            if (trimmed.Contains('@'))
            {
                var parts = trimmed.Split('@', 2);
                return $"{parts[0][0]}***@{parts[1]}";
            }

            return $"{trimmed[..2]}***{trimmed[^1]}";
        }

        private async Task<object> CreateAuthResponseAsync(User user, AuthRefreshToken? currentRefreshToken = null)
        {
            var role = MapRole(user.UserType);
            var secretKey = _configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough";
            var token = TokenHelper.GenerateToken(
                secretKey,
                TokenExpirationMinutes,
                user.Id.ToString(),
                user.UserName,
                role);

            var refreshResult = currentRefreshToken == null
                ? await _refreshTokenService.IssueAsync(user.Id)
                : await _refreshTokenService.RotateAsync(currentRefreshToken);

            return new
            {
                token,
                accessToken = token,
                refreshToken = refreshResult.PlainToken,
                expiresIn = TokenExpirationMinutes * 60,
                user = MapUserResponse(user)
            };
        }

        private static object MapUserResponse(User user)
        {
            var role = MapRole(user.UserType);

            return new
            {
                id = user.Id,
                userName = user.UserName,
                name = user.Name,
                fullName = user.Name,
                email = user.Email,
                phone = user.Phone,
                userType = user.UserType,
                role,
                roles = new[] { role },
                isActive = user.IsActive,
                created = user.Created
            };
        }

        private static string MapRole(int userType)
        {
            return userType switch
            {
                3 => "Admin",
                1 => "Organizer",
                2 => "Sponsor",
                _ => "Volunteer"
            };
        }

        private static string ResolveUsername(RegisterRequest request)
        {
            if (!string.IsNullOrWhiteSpace(request.Username))
            {
                return request.Username.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                return request.Email.Trim();
            }

            return string.Empty;
        }

        private static string ResolveDisplayName(RegisterRequest request, string fallback)
        {
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                return request.Name.Trim();
            }

            var firstName = request.FirstName?.Trim();
            var lastName = request.LastName?.Trim();
            var combined = string.Join(" ", new[] { firstName, lastName }.Where(x => !string.IsNullOrWhiteSpace(x)));

            return string.IsNullOrWhiteSpace(combined) ? fallback : combined;
        }

        private static int ResolveUserType(RegisterRequest request)
        {
            if (request.UserType.HasValue)
            {
                return request.UserType.Value;
            }

            return string.Equals(request.Role, "Organizer", StringComparison.OrdinalIgnoreCase) ? 1
                : string.Equals(request.Role, "Sponsor", StringComparison.OrdinalIgnoreCase) ? 2
                : 0;
        }

        private async Task<string?> ValidateRegisterRequestAsync(RegisterRequest request, string username)
        {
            if (username.Length < 3 || username.Length > 50)
                return "Username must be between 3 and 50 characters";
            if (!Regex.IsMatch(username, "^[a-zA-Z0-9_-]+$"))
                return "Username can only contain letters, numbers, underscore and hyphen";

            if (request.Password.Length < 8)
                return "Password must be at least 8 characters";
            if (!Regex.IsMatch(request.Password, "[A-Za-z]") || !Regex.IsMatch(request.Password, "[0-9]"))
                return "Password must contain at least one letter and one number";

            var userType = ResolveUserType(request);
            if (userType is < 0 or > 2)
                return "Public registration only supports Volunteer, Organizer or Sponsor";

            if (!string.IsNullOrWhiteSpace(request.Role) &&
                !new[] { "Volunteer", "Organizer", "Sponsor" }.Contains(request.Role.Trim(), StringComparer.OrdinalIgnoreCase))
                return "Invalid role";

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                if (request.Email.Length > 100 || !IsValidEmail(request.Email.Trim()))
                    return "Email is invalid";
                var existingEmailUser = (await _userService.GetAll()).FirstOrDefault(u =>
                    string.Equals(u.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase));
                if (existingEmailUser != null)
                    return "Email already exists";
            }

            if ((await _userService.GetAll()).Any(u => string.Equals(u.UserName, username, StringComparison.OrdinalIgnoreCase)))
                return "Username already exists";

            if (!string.IsNullOrWhiteSpace(request.Phone) &&
                (request.Phone.Trim().Length > 20 || !Regex.IsMatch(request.Phone.Trim(), @"^\+?[0-9\s.-]{8,20}$")))
                return "Phone number is invalid";

            return null;
        }

        private static bool IsValidEmail(string email)
        {
            try
            {
                var address = new MailAddress(email);
                return string.Equals(address.Address, email, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }
    }

    public class LoginRequest
    {
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string Password { get; set; } = "";
    }

    public class RegisterRequest
    {
        public string? Username { get; set; }
        public string? Name { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string Password { get; set; } = "";
        public int? UserType { get; set; }
        public string? Role { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = "";
        public string NewPassword { get; set; } = "";
        public string? ConfirmNewPassword { get; set; }
    }

    public class RefreshTokenRequest
    {
        public string RefreshToken { get; set; } = "";
    }
}
