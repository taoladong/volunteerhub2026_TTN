namespace BaseCore.Entities
{
    public class Badge
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public string Condition { get; set; } // JSON: {"min_events":1} or {"min_hours":50}
    }
}
