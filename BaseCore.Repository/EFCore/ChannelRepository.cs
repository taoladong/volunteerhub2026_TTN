using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IChannelRepositoryEF : IRepository<Channel>
    {
        Task<Channel?> GetByEventAsync(int eventId);
        Task<(List<Post> Items, int TotalCount)> GetPostsAsync(int channelId, int page, int pageSize);
    }

    public class ChannelRepositoryEF : Repository<Channel>, IChannelRepositoryEF
    {
        public ChannelRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<Channel?> GetByEventAsync(int eventId)
        {
            return await _dbSet
                .Include(c => c.Event)
                .FirstOrDefaultAsync(c => c.EventId == eventId);
        }

        public async Task<(List<Post> Items, int TotalCount)> GetPostsAsync(int channelId, int page, int pageSize)
        {
            var query = _context.Posts
                .Include(p => p.Author)
                .Include(p => p.Comments).ThenInclude(c => c.Author)
                .Where(p => p.ChannelId == channelId)
                .OrderByDescending(p => p.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }
    }
}
