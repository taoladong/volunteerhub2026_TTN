using System;
using System.Collections.Generic;

namespace BaseCore.Entities
{
    public class Channel
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string Name { get; set; }
        public int? ParentChannelId { get; set; }
        public int? ShiftId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;

        // Navigation
        public Event Event { get; set; }
        public Channel ParentChannel { get; set; }
        public WorkShift Shift { get; set; }
        public List<Post> Posts { get; set; }
        public List<Channel> SubChannels { get; set; }
    }
}
