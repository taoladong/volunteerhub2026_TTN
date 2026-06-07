using System;
using System.Collections.Generic;

namespace BaseCore.Entities
{
    public class SupportCampaign
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal TargetAmount { get; set; }
        public decimal? MinimumAmount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string ReceiveInfo { get; set; } = "";
        // Thông tin chuyển khoản có cấu trúc để sinh VietQR (thanh toán ngoài hệ thống)
        public string BankBin { get; set; } = "";          // mã BIN ngân hàng, vd 970422 (MB)
        public string BankAccountNo { get; set; } = "";    // số tài khoản
        public string BankAccountName { get; set; } = "";  // tên chủ tài khoản
        public string TransparencyNote { get; set; } = "";
        public string Status { get; set; } = "Draft";
        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public decimal? UsedAmount { get; set; }
        public string ReportSummary { get; set; } = "";
        public string ExpenseDetails { get; set; } = "";
        public string ReportAttachmentUrl { get; set; } = "";
        public DateTime? ReportedAt { get; set; }
        public int? ReportedBy { get; set; }

        public Event Event { get; set; }
        public User Creator { get; set; }
        public User Reporter { get; set; }
        public List<IndividualDonation> Donations { get; set; } = new();
    }
}
