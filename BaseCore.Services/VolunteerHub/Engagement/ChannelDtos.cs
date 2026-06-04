namespace BaseCore.Services.VolunteerHub
{
    public class AttachmentDto
    {
        public string Url { get; set; } = "";
        public string Name { get; set; } = "";
        public string Type { get; set; } = "";
        public long Size { get; set; }
    }

    public class PollCreateDto
    {
        public string Question { get; set; } = "";
        public bool AllowMultiple { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public List<string> Options { get; set; } = new();
    }
}
