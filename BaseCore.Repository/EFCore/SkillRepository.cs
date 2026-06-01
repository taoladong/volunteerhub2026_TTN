using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface ISkillRepositoryEF : IRepository<Skill>
    {
        Task<List<Skill>> GetByCategoryAsync(string category);
    }

    public class SkillRepositoryEF : Repository<Skill>, ISkillRepositoryEF
    {
        public SkillRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<List<Skill>> GetByCategoryAsync(string category)
        {
            return await _dbSet.Where(s => s.Category == category).ToListAsync();
        }
    }
}
