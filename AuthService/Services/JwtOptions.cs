namespace AuthService.Services;

public class JwtOptions
{
    public string Issuer { get; set; } = "VolunteerHub.AuthService";
    public string Audience { get; set; } = "VolunteerHub";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 14;
}
