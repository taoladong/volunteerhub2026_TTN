namespace EventService.Entities
{
    public class VolunteerProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int TotalEventsAttended { get; set; }
        public decimal TotalVolunteerHours { get; set; }
        public string KycStatus { get; set; }
    }

    public class CertificateJob
    {
        public int Id { get; set; }
        public int RegistrationId { get; set; }
        public int CertificateId { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public string Status { get; set; }
    }

    public class Channel
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int? ShiftId { get; set; }
        public int? ParentChannelId { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public string Name { get; set; }
        public System.Collections.Generic.List<object> Posts { get; set; } = new System.Collections.Generic.List<object>();
    }

}
