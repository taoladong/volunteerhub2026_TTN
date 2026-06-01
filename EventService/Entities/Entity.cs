using System;

namespace EventService.Entities
{
    public interface IAuditable
    {
        DateTime CreatedAt { get; set; }
        DateTime? UpdatedAt { get; set; }
    }

    public abstract class Entity
    {
        public int Id { get; set; }
    }
}
