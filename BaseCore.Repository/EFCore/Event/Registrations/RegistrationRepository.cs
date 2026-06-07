using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IRegistrationRepositoryEF : IRepository<Registration>
    {
        Task<List<Registration>> GetByEventAsync(int eventId);
        Task<List<Registration>> GetByUserAsync(int userId);
        Task<Registration?> GetByEventAndUserAsync(int eventId, int userId);
        Task<List<Registration>> GetAttendedByEventAsync(int eventId);
        Task<bool> ExistsAsync(int eventId, int userId);
    }

    public class RegistrationRepositoryEF : Repository<Registration>, IRegistrationRepositoryEF
    {
        public RegistrationRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<List<Registration>> GetByEventAsync(int eventId)
        {
            return await _dbSet
                .Include(r => r.User)
                .Include(r => r.Shift)
                .Where(r => r.EventId == eventId)
                .OrderByDescending(r => r.RegisteredAt)
                .ToListAsync();
        }

        public async Task<List<Registration>> GetByUserAsync(int userId)
        {
            return await _dbSet
                .Include(r => r.Event).ThenInclude(e => e.Category)
                .Include(r => r.Shift)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.RegisteredAt)
                .ToListAsync();
        }

        public async Task<Registration?> GetByEventAndUserAsync(int eventId, int userId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId);
        }

        public async Task<List<Registration>> GetAttendedByEventAsync(int eventId)
        {
            return await _dbSet
                .Include(r => r.User)
                .Where(r => r.EventId == eventId && r.IsAttended)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(int eventId, int userId)
        {
            return await _dbSet.AnyAsync(r => r.EventId == eventId && r.UserId == userId);
        }
    }
}
