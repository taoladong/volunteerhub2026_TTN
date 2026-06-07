using System;

namespace BaseCore.Entities
{
    public class CertificateJob
    {
        public int Id { get; set; }
        public int CertificateId { get; set; }
        public string Status { get; set; } = "Pending";
        public int Attempts { get; set; }
        public string ErrorMessage { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? StartedAtUtc { get; set; }
        public DateTime? CompletedAtUtc { get; set; }

        public Certificate Certificate { get; set; }
    }
}
