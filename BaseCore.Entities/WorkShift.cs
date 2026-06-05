using System;

namespace BaseCore.Entities
{
    public class WorkShift
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string Name { get; set; } // "Ca sáng", "Hậu cần", "Truyền thông"
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public int MaxVolunteers { get; set; }
        public int? RequiredSkillId { get; set; }

        // Navigation
        public Event Event { get; set; }
        public Skill RequiredSkill { get; set; }
    }
}
