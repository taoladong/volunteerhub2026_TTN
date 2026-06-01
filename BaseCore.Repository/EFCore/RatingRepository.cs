using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IRatingRepositoryEF : IRepository<Rating>
    {
        Task<List<Rating>> GetByRateeAsync(int rateeId);
        Task<bool> ExistsAsync(int eventId, int raterId, int rateeId);
        Task<double> GetAverageScoreAsync(int rateeId);
    }

    public class RatingRepositoryEF : Repository<Rating>, IRatingRepositoryEF
    {
        public RatingRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<List<Rating>> GetByRateeAsync(int rateeId)
        {
            return await _dbSet
                .Include(r => r.Rater)
                .Include(r => r.Event)
                .Where(r => r.RateeId == rateeId && !r.IsHidden)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(int eventId, int raterId, int rateeId)
        {
            return await _dbSet.AnyAsync(r => r.EventId == eventId && r.RaterId == raterId && r.RateeId == rateeId);
        }

        public async Task<double> GetAverageScoreAsync(int rateeId)
        {
            var ratings = await _dbSet.Where(r => r.RateeId == rateeId && !r.IsHidden).ToListAsync();
            return ratings.Any() ? ratings.Average(r => r.Score) : 0;
        }
    }
}
