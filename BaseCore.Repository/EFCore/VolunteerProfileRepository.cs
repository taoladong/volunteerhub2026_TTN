using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IVolunteerProfileRepositoryEF : IRepository<VolunteerProfile>
    {
        Task<VolunteerProfile?> GetByUserIdAsync(int userId);
        Task<List<VolunteerSkill>> GetSkillsByUserIdAsync(int userId);
        Task AddSkillAsync(VolunteerSkill volunteerSkill);
        Task UpdateSkillAsync(VolunteerSkill volunteerSkill);
        Task RemoveSkillAsync(int userId, int skillId);
    }

    public class VolunteerProfileRepositoryEF : Repository<VolunteerProfile>, IVolunteerProfileRepositoryEF
    {
        public VolunteerProfileRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<VolunteerProfile?> GetByUserIdAsync(int userId)
        {
            return await _dbSet.Include(p => p.User)
                               .FirstOrDefaultAsync(p => p.UserId == userId);
        }

        public async Task<List<VolunteerSkill>> GetSkillsByUserIdAsync(int userId)
        {
            return await _context.VolunteerSkills
                .Include(vs => vs.Skill)
                .Where(vs => vs.UserId == userId)
                .ToListAsync();
        }

        public async Task AddSkillAsync(VolunteerSkill volunteerSkill)
        {
            _context.VolunteerSkills.Add(volunteerSkill);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateSkillAsync(VolunteerSkill volunteerSkill)
        {
            _context.VolunteerSkills.Update(volunteerSkill);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveSkillAsync(int userId, int skillId)
        {
            var vs = await _context.VolunteerSkills
                .FirstOrDefaultAsync(x => x.UserId == userId && x.SkillId == skillId);
            if (vs != null)
            {
                _context.VolunteerSkills.Remove(vs);
                await _context.SaveChangesAsync();
            }
        }
    }
}
