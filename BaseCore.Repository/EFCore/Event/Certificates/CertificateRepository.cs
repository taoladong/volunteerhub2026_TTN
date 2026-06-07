using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface ICertificateRepositoryEF : IRepository<Certificate>
    {
        Task<List<Certificate>> GetByUserAsync(int userId);
        Task<Certificate?> GetByCodeAsync(string code);
        Task<bool> ExistsAsync(int userId, int eventId);
    }

    public class CertificateRepositoryEF : Repository<Certificate>, ICertificateRepositoryEF
    {
        public CertificateRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<List<Certificate>> GetByUserAsync(int userId)
        {
            return await _dbSet
                .Include(c => c.Event).ThenInclude(e => e.Category)
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.IssuedAt)
                .ToListAsync();
        }

        public async Task<Certificate?> GetByCodeAsync(string code)
        {
            return await _dbSet
                .Include(c => c.User)
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.CertificateCode == code);
        }

        public async Task<bool> ExistsAsync(int userId, int eventId)
        {
            return await _dbSet.AnyAsync(c => c.UserId == userId && c.EventId == eventId);
        }
    }
}
