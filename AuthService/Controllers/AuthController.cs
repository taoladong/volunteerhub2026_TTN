using AuthService.Contracts;
using AuthService.Data;
using AuthService.Entities;
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

    private readonly AuthDbContext _dbContext;
    private readonly IPasswordHashingService _passwordHashingService;
    private readonly ITokenService _tokenService;

    public AuthController(
        AuthDbContext dbContext,
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

        var role = await GetOrCreateRoleAsync(roleName, cancellationToken);
        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = _passwordHashingService.Hash(request.Password),
            UserRoles = new List<UserRole>
            {
                new() { Role = role }
            }
        };

        if (string.Equals(role.Name, "Volunteer", StringComparison.OrdinalIgnoreCase))
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

        var refreshToken = await _dbContext.RefreshTokens
            .Include(token => token.User)
                .ThenInclude(user => user.UserRoles)
                    .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(token => token.Token == request.RefreshToken, cancellationToken);

        if (refreshToken is null ||
            refreshToken.RevokedAt is not null ||
            refreshToken.ExpiresAt <= DateTime.UtcNow ||
            !refreshToken.User.IsActive)
        {
            return Unauthorized(new { message = "Refresh token is invalid or expired." });
        }

        refreshToken.RevokedAt = DateTime.UtcNow;
        return Ok(await CreateAuthResponseAsync(refreshToken.User, cancellationToken));
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
        var refreshToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(
                token => token.UserId == userId && token.Token == request.RefreshToken && token.RevokedAt == null,
                cancellationToken);

        if (refreshToken is not null)
        {
            refreshToken.RevokedAt = DateTime.UtcNow;
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
            .Include(entity => entity.UserRoles)
                .ThenInclude(userRole => userRole.Role)
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
        var refreshToken = _tokenService.CreateRefreshToken();

        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken.Token,
            ExpiresAt = refreshToken.ExpiresAt
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.UserRoles.Select(userRole => userRole.Role.Name).ToArray(),
            accessToken.Token,
            accessToken.ExpiresAt,
            refreshToken.Token,
            refreshToken.ExpiresAt);
    }

    private async Task<Role> GetOrCreateRoleAsync(string roleName, CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles.FirstOrDefaultAsync(entity => entity.Name == roleName, cancellationToken);
        if (role is not null)
        {
            return role;
        }

        role = new Role { Name = roleName };
        _dbContext.Roles.Add(role);
        return role;
    }

    private Task<User?> LoadUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return _dbContext.Users
            .Include(user => user.UserRoles)
                .ThenInclude(userRole => userRole.Role)
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    private static CurrentUserResponse ToCurrentUserResponse(User user)
    {
        return new CurrentUserResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.UserRoles.Select(userRole => userRole.Role.Name).ToArray());
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static string? ValidateRegisterRequest(RegisterRequest request, string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(normalizedEmail) || !normalizedEmail.Contains('@'))
        {
            return "A valid email is required.";
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Full name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return "Password must be at least 8 characters.";
        }

        return null;
    }
}
