using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IEventCategoryRepositoryEF : IRepository<EventCategory> { }

    public class EventCategoryRepositoryEF : Repository<EventCategory>, IEventCategoryRepositoryEF
    {
        public EventCategoryRepositoryEF(MySqlDbContext context) : base(context) { }
    }
}
