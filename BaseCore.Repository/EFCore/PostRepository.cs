using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IPostRepositoryEF : IRepository<Post>
    {
        Task<Post?> GetWithDetailsAsync(int postId);
        Task<List<Comment>> GetCommentsAsync(int postId);
        Task<bool> HasLikedAsync(int postId, int userId);
    }

    public class PostRepositoryEF : Repository<Post>, IPostRepositoryEF
    {
        public PostRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<Post?> GetWithDetailsAsync(int postId)
        {
            return await _dbSet
                .Include(p => p.Author)
                .Include(p => p.Comments).ThenInclude(c => c.Author)
                .FirstOrDefaultAsync(p => p.Id == postId);
        }

        public async Task<List<Comment>> GetCommentsAsync(int postId)
        {
            return await _context.Comments
                .Include(c => c.Author)
                .Where(c => c.PostId == postId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> HasLikedAsync(int postId, int userId)
        {
            return await _context.Likes.AnyAsync(l => l.PostId == postId && l.UserId == userId);
        }
    }
}
