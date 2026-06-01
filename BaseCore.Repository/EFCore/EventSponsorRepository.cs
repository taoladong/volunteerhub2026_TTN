using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IEventSponsorRepositoryEF : IRepository<EventSponsor>
    {
        Task<List<EventSponsor>> GetByEventAsync(int eventId);
        Task<List<EventSponsor>> GetBySponsorAsync(int sponsorId);
    }

    public class EventSponsorRepositoryEF : Repository<EventSponsor>, IEventSponsorRepositoryEF
    {
        public EventSponsorRepositoryEF(MySqlDbContext context) : base(context) { }

        public async Task<List<EventSponsor>> GetByEventAsync(int eventId)
        {
            return await _dbSet
                .Include(s => s.Sponsor)
                .Where(s => s.EventId == eventId)
                .OrderByDescending(s => s.SponsoredAt)
                .ToListAsync();
        }

        public async Task<List<EventSponsor>> GetBySponsorAsync(int sponsorId)
        {
            return await _dbSet
                .Include(s => s.Event)
                .ThenInclude(e => e.Category)
                .Where(s => s.SponsorId == sponsorId)
                .OrderByDescending(s => s.SponsoredAt)
                .ToListAsync();
        }
    }
}
