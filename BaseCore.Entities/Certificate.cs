using System;

namespace BaseCore.Entities
{
    public class Certificate
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int EventId { get; set; }
        public string CertificateCode { get; set; } // unique QR identifier
        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public decimal VolunteerHours { get; set; }
        public string PdfUrl { get; set; }

        // Navigation
        public User User { get; set; }
        public Event Event { get; set; }
    }
}
