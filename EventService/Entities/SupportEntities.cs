namespace EventService.Entities;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string UserName { get; set; } = "";
    public int UserType { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Skill
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
}

public class VolunteerSkill
{
    public int UserId { get; set; }
    public int SkillId { get; set; }
    public string Level { get; set; } = "";
    public string VerificationStatus { get; set; } = "";
    public Skill Skill { get; set; } = null!;
}

public class VolunteerProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string KycStatus { get; set; } = "";
    public decimal TotalVolunteerHours { get; set; }
}

public class OrganizerVerification
{
    public int Id { get; set; }
    public int OrganizerId { get; set; }
    public string Status { get; set; } = "";
}

public class Certificate
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int EventId { get; set; }
    public string CertificateCode { get; set; } = "";
    public DateTime IssuedAt { get; set; }
    public decimal VolunteerHours { get; set; }
    public string PdfUrl { get; set; } = "";
    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
}

public class CertificateJob
{
    public int Id { get; set; }
    public int CertificateId { get; set; }
    public string Status { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int? EntityId { get; set; }
    public string Metadata { get; set; } = "";
    public string IpAddress { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public User? User { get; set; }
}

public class Channel
{
    public int Id { get; set; }
    public int? EventId { get; set; }
    public int? ShiftId { get; set; }
    public int? ParentChannelId { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public Event? Event { get; set; }
    public WorkShift? Shift { get; set; }
    public List<ChannelPost> Posts { get; set; } = new();
}

public class ChannelPost
{
    public int Id { get; set; }
    public int ChannelId { get; set; }
    public Channel Channel { get; set; } = null!;
}

public class EventSponsor
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public decimal Amount { get; set; }
}

public class SupportCampaign
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal TargetAmount { get; set; }
    public decimal UsedAmount { get; set; }
    public string ReportSummary { get; set; } = "";
    public DateTime? ReportedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<IndividualDonation> Donations { get; set; } = new();
}

public class IndividualDonation
{
    public int Id { get; set; }
    public int CampaignId { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "";
    public bool IsAnonymous { get; set; }
    public string DisplayName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string RejectedReason { get; set; } = "";
    public DateTime? UpdatedAt { get; set; }
    public SupportCampaign Campaign { get; set; } = null!;
}

public class SponsorshipProposal
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public int SponsorId { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "";
    public string PublicSponsorName { get; set; } = "";
    public string Type { get; set; } = "";
    public decimal? RequestedAmount { get; set; }
    public decimal? OfferedAmount { get; set; }
    public decimal? ActualReceivedAmount { get; set; }
    public decimal UsedAmount { get; set; }
    public string ReportSummary { get; set; } = "";
    public DateTime? ReportedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
    public int? LegacyEventSponsorId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string ResponseMessage { get; set; } = "";
    public User Sponsor { get; set; } = null!;
}
