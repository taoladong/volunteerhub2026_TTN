using System;

namespace BaseCore.Entities
{
    public class AuditLog
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string Action { get; set; } = "";
        public string EntityType { get; set; } = "";
        public int? EntityId { get; set; }
        public string Metadata { get; set; } = "";
        public string IpAddress { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public User User { get; set; }
    }
}
