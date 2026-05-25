namespace AuthService.Contracts;

public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string? Role);

public record LoginRequest(string Email, string Password);

public record RefreshTokenRequest(string RefreshToken);

public record LogoutRequest(string RefreshToken);

public record AuthResponse(
    int UserId,
    string Email,
    string FullName,
    IReadOnlyCollection<string> Roles,
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt);

public record CurrentUserResponse(
    int UserId,
    string Email,
    string FullName,
    IReadOnlyCollection<string> Roles);
