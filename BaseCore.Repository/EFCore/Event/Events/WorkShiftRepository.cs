using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IWorkShiftRepositoryEF : IRepository<WorkShift>
    {
        Task<List<WorkShift>> GetByEventAsync(int eventId);
    }

    public class WorkShiftRepositoryEF : Repository<WorkShift>, IWorkShiftRepositoryEF
    {
        public WorkShiftRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<List<WorkShift>> GetByEventAsync(int eventId)
        {
            return await _dbSet
                .Include(ws => ws.RequiredSkill)
                .Where(ws => ws.EventId == eventId)
                .OrderBy(ws => ws.StartTime)
                .ToListAsync();
        }
    }
}
