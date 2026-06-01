using Microsoft.EntityFrameworkCore;
using EventService.Entities;

namespace EventService.Data
{
    public class EventDbContext : DbContext
    {
        public EventDbContext(DbContextOptions<EventDbContext> options) : base(options) { }

        public DbSet<Event> Events { get; set; } = null!;
        public DbSet<Registration> Registrations { get; set; } = null!;
        public DbSet<WorkShift> WorkShifts { get; set; } = null!;
        public DbSet<EventCategory> EventCategories { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<Certificate> Certificates { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<VolunteerSkill> VolunteerSkills { get; set; } = null!;
        public DbSet<Skill> Skills { get; set; } = null!;
        public DbSet<OrganizerVerification> OrganizerVerifications { get; set; } = null!;
        public DbSet<EventSponsor> EventSponsors { get; set; } = null!;
        public DbSet<SponsorshipProposal> SponsorshipProposals { get; set; } = null!;
        public DbSet<SupportCampaign> SupportCampaigns { get; set; } = null!;
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<VolunteerProfile> VolunteerProfiles { get; set; }
        public DbSet<CertificateJob> CertificateJobs { get; set; }
        public DbSet<Channel> Channels { get; set; }
        public DbSet<IndividualDonation> IndividualDonations { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
