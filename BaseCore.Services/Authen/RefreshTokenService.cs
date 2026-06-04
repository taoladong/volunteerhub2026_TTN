using BaseCore.Entities;
using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BaseCore.Services.Authen
{
    public interface IRefreshTokenService
    {
        Task<(AuthRefreshToken Entity, string PlainToken)> IssueAsync(int userId);
        Task<AuthRefreshToken?> GetActiveTokenAsync(string plainToken);
        Task<(AuthRefreshToken Entity, string PlainToken)> RotateAsync(AuthRefreshToken currentToken);
        Task<bool> RevokeAsync(string plainToken);
    }

    public class RefreshTokenService : IRefreshTokenService
    {
        private readonly BaseCore.Repository.EFCore.IUnitOfWork _unitOfWork;
        private const int RefreshTokenDays = 14;

        public RefreshTokenService(BaseCore.Repository.EFCore.IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<(AuthRefreshToken Entity, string PlainToken)> IssueAsync(int userId)
        {
            var plainToken = GenerateToken();
            var entity = new AuthRefreshToken
            {
                UserId = userId,
                TokenHash = HashToken(plainToken),
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(RefreshTokenDays)
            };

            await _unitOfWork.AuthRefreshTokens.AddAsync(entity);
            await _unitOfWork.SaveChangesAsync();

            return (entity, plainToken);
        }

        public async Task<AuthRefreshToken?> GetActiveTokenAsync(string plainToken)
        {
            var hash = HashToken(plainToken);
            return await _unitOfWork.AuthRefreshTokens.GetQueryable()
                .Include(x => x.User)
                .FirstOrDefaultAsync(x =>
                    x.TokenHash == hash &&
                    x.RevokedAtUtc == null &&
                    x.ExpiresAtUtc > DateTime.UtcNow);
        }

        public async Task<(AuthRefreshToken Entity, string PlainToken)> RotateAsync(AuthRefreshToken currentToken)
        {
            var (newEntity, plainToken) = await IssueAsync(currentToken.UserId);
            currentToken.RevokedAtUtc = DateTime.UtcNow;
            currentToken.ReplacedByTokenHash = newEntity.TokenHash;
            await _unitOfWork.SaveChangesAsync();
            return (newEntity, plainToken);
        }

        public async Task<bool> RevokeAsync(string plainToken)
        {
            var hash = HashToken(plainToken);
            var token = await _unitOfWork.AuthRefreshTokens.GetQueryable().FirstOrDefaultAsync(x => x.TokenHash == hash);
            if (token == null || token.RevokedAtUtc != null)
            {
                return false;
            }

            token.RevokedAtUtc = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static string GenerateToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(64);
            return Convert.ToBase64String(bytes);
        }

        private static string HashToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes);
        }
    }
}
