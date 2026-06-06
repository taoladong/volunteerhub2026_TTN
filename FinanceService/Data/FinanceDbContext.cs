using FinanceService.Entities;
using Microsoft.EntityFrameworkCore;

namespace FinanceService.Data
{
    public class FinanceDbContext : DbContext
    {
        public FinanceDbContext(DbContextOptions<FinanceDbContext> options) : base(options) { }

        public DbSet<EventSponsor> EventSponsors { get; set; }
        public DbSet<IndividualDonation> IndividualDonations { get; set; }
        public DbSet<SponsorProfile> SponsorProfiles { get; set; }
        public DbSet<SponsorshipProposal> SponsorshipProposals { get; set; }
        public DbSet<SupportCampaign> SupportCampaigns { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<IndividualDonation>()
                .HasOne(d => d.Campaign)
                .WithMany(c => c.Donations)
                .HasForeignKey(d => d.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SponsorshipProposal>()
                .HasOne(p => p.LegacyEventSponsor)
                .WithMany()
                .HasForeignKey(p => p.LegacyEventSponsorId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
