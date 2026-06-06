#nullable enable

namespace BaseCore.Entities
{
    public class AuthRefreshToken
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string TokenHash { get; set; } = "";
        public DateTime ExpiresAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? RevokedAtUtc { get; set; }
        public string? ReplacedByTokenHash { get; set; }
        public User User { get; set; } = null!;

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public string Token { get => TokenHash; set => TokenHash = value; }
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public DateTime ExpiresAt { get => ExpiresAtUtc; set => ExpiresAtUtc = value; }
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public DateTime? RevokedAt { get => RevokedAtUtc; set => RevokedAtUtc = value; }
    }
}
