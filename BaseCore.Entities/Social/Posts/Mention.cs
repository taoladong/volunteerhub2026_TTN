using System;

namespace BaseCore.Entities
{
    public class Mention
    {
        public int Id { get; set; }
        public string EntityType { get; set; } = "";
        public int EntityId { get; set; }
        public int MentionedUserId { get; set; }
        public int MentionerUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User MentionedUser { get; set; }
        public User Mentioner { get; set; }
    }
}
