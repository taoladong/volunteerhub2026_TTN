using System.Text.RegularExpressions;
using AuthService.Contracts;
using BaseCore.Repository;
using BaseCore.Entities;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private static readonly HashSet<string> AllowedSelfRegisterRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Volunteer",
        "Organizer"
    };

    private static readonly Regex EmailRegex = new(
        @"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly MySqlDbContext _dbContext;
    private readonly IPasswordHashingService _passwordHashingService;
    private readonly ITokenService _tokenService;

    public AuthController(
        MySqlDbContext dbContext,
        IPasswordHashingService passwordHashingService,
        ITokenService tokenService)
    {
        _dbContext = dbContext;
        _passwordHashingService = passwordHashingService;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var validationError = ValidateRegisterRequest(request, email);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var exists = await _dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken);
        if (exists)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var roleName = string.IsNullOrWhiteSpace(request.Role) ? "Volunteer" : request.Role.Trim();
        if (!AllowedSelfRegisterRoles.Contains(roleName))
        {
            return BadRequest(new { message = "Role must be Volunteer or Organizer." });
        }

        int userType = roleName.Equals("Organizer", StringComparison.OrdinalIgnoreCase) ? 1 : 0;

        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = _passwordHashingService.Hash(request.Password),
            UserType = userType,
            UserName = email
        };

        if (userType == 0)
        {
            user.VolunteerProfile = new VolunteerProfile();
        }

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(await CreateAuthResponseAsync(user, cancellationToken));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        var email = NormalizeEmail(request.Email);
        var user = await LoadUserByEmailAsync(email, cancellationToken);
        if (user is null ||
            !user.IsActive ||
            !_passwordHashingService.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Email or password is invalid." });
        }

        return Ok(await CreateAuthResponseAsync(user, cancellationToken));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { message = "Refresh token is required." });
        }

        var AuthRefreshToken = await _dbContext.AuthRefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.Token == request.RefreshToken, cancellationToken);

        if (AuthRefreshToken is null ||
            AuthRefreshToken.RevokedAt is not null ||
            AuthRefreshToken.ExpiresAt <= DateTime.UtcNow ||
            !AuthRefreshToken.User.IsActive)
        {
            return Unauthorized(new { message = "Refresh token is invalid or expired." });
        }

        AuthRefreshToken.RevokedAt = DateTime.UtcNow;
        return Ok(await CreateAuthResponseAsync(AuthRefreshToken.User, cancellationToken));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { message = "Refresh token is required." });
        }

        var userId = User.GetRequiredUserId();
        var AuthRefreshToken = await _dbContext.AuthRefreshTokens
            .FirstOrDefaultAsync(
                token => token.UserId == userId && token.Token == request.RefreshToken && token.RevokedAt == null,
                cancellationToken);

        if (AuthRefreshToken is not null)
        {
            AuthRefreshToken.RevokedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(entity => entity.Id == userId && entity.IsActive, cancellationToken);

        if (user is null)
        {
            return NotFound(new { message = "User was not found." });
        }

        return Ok(ToCurrentUserResponse(user));
    }

    private async Task<AuthResponse> CreateAuthResponseAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = _tokenService.CreateAccessToken(user);
        var AuthRefreshToken = _tokenService.CreateRefreshToken();

        _dbContext.AuthRefreshTokens.Add(new AuthRefreshToken
        {
            UserId = user.Id,
            Token = AuthRefreshToken.Token,
            ExpiresAt = AuthRefreshToken.ExpiresAt
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(
            user.Id,
            user.Email,
            user.FullName,
            new[] { user.RoleName },
            accessToken.Token,
            accessToken.ExpiresAt,
            AuthRefreshToken.Token,
            AuthRefreshToken.ExpiresAt);
    }

    private Task<User?> LoadUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    private static CurrentUserResponse ToCurrentUserResponse(User user)
    {
        return new CurrentUserResponse(
            user.Id,
            user.Email,
            user.FullName,
            new[] { user.RoleName });
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static string? ValidateRegisterRequest(RegisterRequest request, string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(normalizedEmail) || !EmailRegex.IsMatch(normalizedEmail))
        {
            return "A valid email is required.";
        }

        var fullName = request.FullName?.Trim();
        if (string.IsNullOrEmpty(fullName) || fullName.Length < 2)
        {
            return "Full name must be at least 2 characters.";
        }

        if (fullName.Length > 100)
        {
            return "Full name must not exceed 100 characters.";
        }

        var password = request.Password;
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            return "Password must be at least 8 characters.";
        }

        if (!password.Any(char.IsDigit) || !password.Any(char.IsLetter))
        {
            return "Password must contain both letters and digits.";
        }

        return null;
    }
}
