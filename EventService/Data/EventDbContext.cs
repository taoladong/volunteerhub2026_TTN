using EventService.Entities;
using Microsoft.EntityFrameworkCore;

namespace EventService.Data;

public class EventDbContext : DbContext
{
    public EventDbContext(DbContextOptions<EventDbContext> options) : base(options)
    {
    }

    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventCategory> EventCategories => Set<EventCategory>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Registration> Registrations => Set<Registration>();
    public DbSet<WorkShift> WorkShifts => Set<WorkShift>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<VolunteerSkill> VolunteerSkills => Set<VolunteerSkill>();
    public DbSet<VolunteerProfile> VolunteerProfiles => Set<VolunteerProfile>();
    public DbSet<OrganizerVerification> OrganizerVerifications => Set<OrganizerVerification>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<CertificateJob> CertificateJobs => Set<CertificateJob>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<ChannelPost> ChannelPosts => Set<ChannelPost>();
    public DbSet<EventSponsor> EventSponsors => Set<EventSponsor>();
    public DbSet<SupportCampaign> SupportCampaigns => Set<SupportCampaign>();
    public DbSet<IndividualDonation> IndividualDonations => Set<IndividualDonation>();
    public DbSet<SponsorshipProposal> SponsorshipProposals => Set<SponsorshipProposal>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Event>()
            .HasOne(e => e.Category)
            .WithMany()
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Event>()
            .HasOne(e => e.Organizer)
            .WithMany()
            .HasForeignKey(e => e.OrganizerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Event>()
            .HasMany(e => e.WorkShifts)
            .WithOne(s => s.Event)
            .HasForeignKey(s => s.EventId);

        modelBuilder.Entity<Event>()
            .HasMany(e => e.Registrations)
            .WithOne(r => r.Event)
            .HasForeignKey(r => r.EventId);

        modelBuilder.Entity<Event>()
            .HasMany(e => e.Channels)
            .WithOne(c => c.Event)
            .HasForeignKey(c => c.EventId)
            .IsRequired(false);

        modelBuilder.Entity<Registration>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Registration>()
            .HasOne(r => r.Shift)
            .WithMany()
            .HasForeignKey(r => r.ShiftId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkShift>()
            .HasOne(s => s.RequiredSkill)
            .WithMany()
            .HasForeignKey(s => s.RequiredSkillId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<VolunteerSkill>()
            .HasKey(vs => new { vs.UserId, vs.SkillId });

        modelBuilder.Entity<VolunteerSkill>()
            .HasOne(vs => vs.Skill)
            .WithMany()
            .HasForeignKey(vs => vs.SkillId);

        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Certificate>()
            .HasOne(c => c.Event)
            .WithMany()
            .HasForeignKey(c => c.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .IsRequired(false);

        modelBuilder.Entity<IndividualDonation>()
            .HasOne(d => d.Campaign)
            .WithMany(c => c.Donations)
            .HasForeignKey(d => d.CampaignId);

        modelBuilder.Entity<SponsorshipProposal>()
            .HasOne(p => p.Sponsor)
            .WithMany()
            .HasForeignKey(p => p.SponsorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Channel>()
            .HasMany(c => c.Posts)
            .WithOne(p => p.Channel)
            .HasForeignKey(p => p.ChannelId);
    }
}
