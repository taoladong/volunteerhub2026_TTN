using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository
{
    public class MySqlDbContext : DbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options) : base(options)
        {
        }

        // --- Existing ---
        public DbSet<User> Users { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }

        // --- VolunteerHub: Profile & Skills ---
        public DbSet<Skill> Skills { get; set; }
        public DbSet<VolunteerProfile> VolunteerProfiles { get; set; }
        public DbSet<VolunteerSkill> VolunteerSkills { get; set; }

        // --- VolunteerHub: Events ---
        public DbSet<EventCategory> EventCategories { get; set; }
        public DbSet<Entities.Event> Events { get; set; }
        public DbSet<WorkShift> WorkShifts { get; set; }

        // --- VolunteerHub: Registration ---
        public DbSet<Registration> Registrations { get; set; }
        public DbSet<InterviewSlot> InterviewSlots { get; set; }

        // --- VolunteerHub: Social ---
        public DbSet<Channel> Channels { get; set; }
        public DbSet<Post> Posts { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<Like> Likes { get; set; }
        public DbSet<Mention> Mentions { get; set; }
        public DbSet<Poll> Polls { get; set; }
        public DbSet<PollOption> PollOptions { get; set; }
        public DbSet<PollVote> PollVotes { get; set; }

        // --- VolunteerHub: Recognition ---
        public DbSet<Certificate> Certificates { get; set; }
        public DbSet<Badge> Badges { get; set; }
        public DbSet<UserBadge> UserBadges { get; set; }
        public DbSet<Rating> Ratings { get; set; }

        // --- VolunteerHub: Sponsor & Notification ---
        public DbSet<EventSponsor> EventSponsors { get; set; }
        public DbSet<SupportCampaign> SupportCampaigns { get; set; }
        public DbSet<IndividualDonation> IndividualDonations { get; set; }
        public DbSet<SponsorshipProposal> SponsorshipProposals { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<AuthRefreshToken> AuthRefreshTokens { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<CertificateJob> CertificateJobs { get; set; }
        public DbSet<OrganizerVerification> OrganizerVerifications { get; set; }
        public DbSet<SponsorProfile> SponsorProfiles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // =============================================
            // EXISTING ENTITIES
            // =============================================

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).ValueGeneratedOnAdd();
                entity.Property(e => e.UserName).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Password).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.Email).HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.Phone).HasMaxLength(20).IsRequired(false);
                entity.Property(e => e.Position).HasMaxLength(200).IsRequired(false);
                entity.Property(e => e.Contact).HasMaxLength(200).IsRequired(false);
                entity.Property(e => e.Image).HasMaxLength(500).IsRequired(false);
                entity.HasIndex(e => e.UserName).IsUnique();
            });

            modelBuilder.Entity<AuthRefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TokenHash).HasMaxLength(256).IsRequired();
                entity.Property(e => e.ReplacedByTokenHash).HasMaxLength(256).IsRequired(false);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.TokenHash).IsUnique();
            });

            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
                entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Metadata).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.IpAddress).HasMaxLength(64).IsRequired(false);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.SetNull);
                entity.HasIndex(e => e.CreatedAtUtc);
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
            });

            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500).IsRequired(false);
            });

            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 2);
                entity.Property(e => e.Description).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.ImageUrl).HasMaxLength(500).IsRequired(false);
                entity.HasOne(e => e.Category)
                      .WithMany()
                      .HasForeignKey(e => e.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.ShippingAddress).HasMaxLength(500).IsRequired(false);
            });

            modelBuilder.Entity<OrderDetail>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
                entity.HasOne(e => e.Order)
                      .WithMany(o => o.OrderDetails)
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Product)
                      .WithMany()
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // =============================================
            // VOLUNTEERHUB: PROFILE & SKILLS
            // =============================================

            modelBuilder.Entity<Skill>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Category).HasMaxLength(100).IsRequired(false);
            });

            modelBuilder.Entity<VolunteerProfile>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BloodType).HasMaxLength(5).IsRequired(false);
                entity.Property(e => e.Interests).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.TotalVolunteerHours).HasPrecision(10, 2);
                entity.Property(e => e.Bio).HasMaxLength(2000).IsRequired(false);
                entity.Property(e => e.AvatarUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.KycStatus).HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.IdentityFrontImageUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.IdentityBackImageUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.PortraitImageUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.KycAdminNote).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.TotalDonatedAmount).HasPrecision(18, 2);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.UserId).IsUnique();
            });

            modelBuilder.Entity<VolunteerSkill>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Level).HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.VerificationStatus).HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.EvidenceUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.VerificationNote).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.AdminNote).HasMaxLength(1000).IsRequired(false);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Skill)
                      .WithMany()
                      .HasForeignKey(e => e.SkillId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.UserId, e.SkillId }).IsUnique();
            });

            // =============================================
            // VOLUNTEERHUB: EVENTS
            // =============================================

            modelBuilder.Entity<EventCategory>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Icon).HasMaxLength(100).IsRequired(false);
            });

            modelBuilder.Entity<Entities.Event>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(2000).IsRequired(false);
                entity.Property(e => e.Location).HasMaxLength(300).IsRequired(false);
                entity.Property(e => e.Latitude).HasPrecision(9, 6);
                entity.Property(e => e.Longitude).HasPrecision(9, 6);
                entity.Property(e => e.CheckInRadiusKm).HasPrecision(5, 2).HasDefaultValue(0.5m);
                entity.Property(e => e.RequiredSkillIds).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.ImageUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.QrCode).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.CancelReason).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.RejectReason).HasMaxLength(1000).IsRequired(false);
                entity.HasOne(e => e.Category)
                      .WithMany()
                      .HasForeignKey(e => e.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Organizer)
                      .WithMany()
                      .HasForeignKey(e => e.OrganizerId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<WorkShift>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.HasOne(e => e.Event)
                      .WithMany(ev => ev.WorkShifts)
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.RequiredSkill)
                      .WithMany()
                      .HasForeignKey(e => e.RequiredSkillId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
            });

            // =============================================
            // VOLUNTEERHUB: REGISTRATION
            // =============================================

            modelBuilder.Entity<Registration>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.Note).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.VolunteerHours).HasPrecision(5, 2);
                entity.Property(e => e.CancelReason).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.InterviewStatus).HasMaxLength(20).IsRequired(false);
                entity.HasOne(e => e.Event)
                      .WithMany(ev => ev.Registrations)
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Shift)
                      .WithMany()
                      .HasForeignKey(e => e.ShiftId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasIndex(e => new { e.EventId, e.UserId }).IsUnique();
            });

            modelBuilder.Entity<InterviewSlot>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MeetingUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Note).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.Status).HasMaxLength(20).IsRequired(false);
                entity.Property(e => e.DecisionNote).HasMaxLength(1000).IsRequired(false);
                entity.HasIndex(e => e.RegistrationId).IsUnique();
                entity.HasIndex(e => new { e.EventId, e.Status });
                entity.HasOne(e => e.Registration)
                      .WithOne(r => r.InterviewSlot)
                      .HasForeignKey<InterviewSlot>(e => e.RegistrationId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Event)
                      .WithMany()
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.NoAction); // tránh multiple cascade path qua Event
            });

            // =============================================
            // VOLUNTEERHUB: SOCIAL
            // =============================================

            modelBuilder.Entity<Channel>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(200).IsRequired(false);
                entity.HasOne(e => e.Event)
                      .WithMany(ev => ev.Channels)
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.ParentChannel)
                      .WithMany(c => c.SubChannels)
                      .HasForeignKey(e => e.ParentChannelId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasOne(e => e.Shift)
                      .WithMany()
                      .HasForeignKey(e => e.ShiftId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasIndex(e => new { e.EventId, e.ParentChannelId });
                entity.HasIndex(e => e.ShiftId).IsUnique().HasFilter("[ShiftId] IS NOT NULL");
            });

            modelBuilder.Entity<Post>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.ImageUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.PostType).HasMaxLength(30).HasDefaultValue("discussion").IsRequired();
                entity.Property(e => e.AttachmentUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.AttachmentName).HasMaxLength(255).IsRequired(false);
                entity.Property(e => e.AttachmentType).HasMaxLength(50).IsRequired(false);
                entity.HasOne(e => e.Channel)
                      .WithMany(c => c.Posts)
                      .HasForeignKey(e => e.ChannelId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Author)
                      .WithMany()
                      .HasForeignKey(e => e.AuthorId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Comment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Content).HasMaxLength(1000).IsRequired();
                entity.HasOne(e => e.Post)
                      .WithMany(p => p.Comments)
                      .HasForeignKey(e => e.PostId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Author)
                      .WithMany()
                      .HasForeignKey(e => e.AuthorId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ParentComment)
                      .WithMany()
                      .HasForeignKey(e => e.ParentCommentId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
            });

            modelBuilder.Entity<Like>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Post)
                      .WithMany(p => p.Likes)
                      .HasForeignKey(e => e.PostId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.PostId, e.UserId }).IsUnique();
            });

            modelBuilder.Entity<Mention>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EntityType).HasMaxLength(20).IsRequired();
                entity.HasOne(e => e.MentionedUser)
                      .WithMany()
                      .HasForeignKey(e => e.MentionedUserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Mentioner)
                      .WithMany()
                      .HasForeignKey(e => e.MentionerUserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.EntityType, e.EntityId });
                entity.HasIndex(e => e.MentionedUserId);
            });

            modelBuilder.Entity<Poll>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Question).HasMaxLength(500).IsRequired();
                entity.HasOne(e => e.Post)
                      .WithOne(p => p.Poll)
                      .HasForeignKey<Poll>(e => e.PostId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.PostId).IsUnique();
            });

            modelBuilder.Entity<PollOption>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Text).HasMaxLength(200).IsRequired();
                entity.HasOne(e => e.Poll)
                      .WithMany(p => p.Options)
                      .HasForeignKey(e => e.PollId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.PollId, e.SortOrder });
            });

            modelBuilder.Entity<PollVote>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Poll)
                      .WithMany(p => p.Votes)
                      .HasForeignKey(e => e.PollId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Option)
                      .WithMany()
                      .HasForeignKey(e => e.OptionId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.PollId, e.UserId, e.OptionId }).IsUnique();
                entity.HasIndex(e => new { e.PollId, e.UserId });
            });

            // =============================================
            // VOLUNTEERHUB: RECOGNITION
            // =============================================

            modelBuilder.Entity<Certificate>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CertificateCode).HasMaxLength(50).IsRequired();
                entity.Property(e => e.VolunteerHours).HasPrecision(5, 2);
                entity.Property(e => e.PdfUrl).HasMaxLength(500).IsRequired(false);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Event)
                      .WithMany()
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => e.CertificateCode).IsUnique();
                entity.HasIndex(e => new { e.UserId, e.EventId }).IsUnique();
            });

            modelBuilder.Entity<CertificateJob>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                entity.Property(e => e.ErrorMessage).HasMaxLength(1000).IsRequired(false);
                entity.HasOne(e => e.Certificate)
                      .WithMany()
                      .HasForeignKey(e => e.CertificateId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.CertificateId);
                entity.HasIndex(e => new { e.Status, e.CreatedAtUtc });
            });

            modelBuilder.Entity<OrganizerVerification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OrganizationName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.LogoUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.RepresentativeName).HasMaxLength(150).IsRequired();
                entity.Property(e => e.ContactEmail).HasMaxLength(150).IsRequired();
                entity.Property(e => e.Phone).HasMaxLength(30).IsRequired(false);
                entity.Property(e => e.Address).HasMaxLength(300).IsRequired(false);
                entity.Property(e => e.WebsiteUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Description).HasMaxLength(2000).IsRequired();
                entity.Property(e => e.DocumentUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.VerificationNote).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                entity.Property(e => e.AdminNote).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.RejectReason).HasMaxLength(1000).IsRequired(false);
                entity.HasOne(e => e.Organizer)
                      .WithMany()
                      .HasForeignKey(e => e.OrganizerId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Verifier)
                      .WithMany()
                      .HasForeignKey(e => e.VerifiedBy)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasIndex(e => e.OrganizerId).IsUnique();
                entity.HasIndex(e => new { e.Status, e.SubmittedAt });
            });

            modelBuilder.Entity<Badge>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.IconUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Condition).HasMaxLength(500).IsRequired(false);
            });

            modelBuilder.Entity<UserBadge>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Badge)
                      .WithMany()
                      .HasForeignKey(e => e.BadgeId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.UserId, e.BadgeId }).IsUnique();
            });

            modelBuilder.Entity<Rating>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Comment).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.HiddenReason).HasMaxLength(500).IsRequired(false);
                entity.HasOne(e => e.Event)
                      .WithMany()
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Rater)
                      .WithMany()
                      .HasForeignKey(e => e.RaterId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Ratee)
                      .WithMany()
                      .HasForeignKey(e => e.RateeId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.EventId, e.RaterId, e.RateeId }).IsUnique();
            });

            // =============================================
            // VOLUNTEERHUB: SPONSOR & NOTIFICATION
            // =============================================

            modelBuilder.Entity<EventSponsor>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ContributionType).HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.Note).HasMaxLength(500).IsRequired(false);
                entity.HasOne(e => e.Event)
                      .WithMany()
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Sponsor)
                      .WithMany()
                      .HasForeignKey(e => e.SponsorId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SupportCampaign>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(2000).IsRequired();
                entity.Property(e => e.TargetAmount).HasPrecision(18, 2);
                entity.Property(e => e.MinimumAmount).HasPrecision(18, 2);
                entity.Property(e => e.ReceiveInfo).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.BankBin).HasMaxLength(20).IsRequired(false);
                entity.Property(e => e.BankAccountNo).HasMaxLength(40).IsRequired(false);
                entity.Property(e => e.BankAccountName).HasMaxLength(120).IsRequired(false);
                entity.Property(e => e.TransparencyNote).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                entity.Property(e => e.UsedAmount).HasPrecision(18, 2);
                entity.Property(e => e.ReportSummary).HasMaxLength(2000).IsRequired(false);
                entity.Property(e => e.ExpenseDetails).HasMaxLength(4000).IsRequired(false);
                entity.Property(e => e.ReportAttachmentUrl).HasMaxLength(500).IsRequired(false);
                entity.HasOne(e => e.Event)
                      .WithMany()
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Creator)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Reporter)
                      .WithMany()
                      .HasForeignKey(e => e.ReportedBy)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasIndex(e => new { e.EventId, e.Status });
            });

            modelBuilder.Entity<IndividualDonation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.DisplayName).HasMaxLength(120).IsRequired(false);
                entity.Property(e => e.Phone).HasMaxLength(30).IsRequired(false);
                entity.Property(e => e.Email).HasMaxLength(120).IsRequired(false);
                entity.Property(e => e.Note).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.ProofImageUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.RejectedReason).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                entity.HasOne(e => e.Campaign)
                      .WithMany(c => c.Donations)
                      .HasForeignKey(e => e.CampaignId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Confirmer)
                      .WithMany()
                      .HasForeignKey(e => e.ConfirmedBy)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasIndex(e => new { e.CampaignId, e.Status });
                entity.HasIndex(e => e.UserId);
            });

            modelBuilder.Entity<SponsorshipProposal>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Message).HasMaxLength(2000).IsRequired();
                entity.Property(e => e.RequestedAmount).HasPrecision(18, 2);
                entity.Property(e => e.OfferedAmount).HasPrecision(18, 2);
                entity.Property(e => e.Purpose).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.SponsorBenefits).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.PublicSponsorName).HasMaxLength(200).IsRequired(false);
                entity.Property(e => e.PublicMessage).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.LogoUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.AttachmentUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.ResponseMessage).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
                entity.Property(e => e.ActualReceivedAmount).HasPrecision(18, 2);
                entity.Property(e => e.UsedAmount).HasPrecision(18, 2);
                entity.Property(e => e.ReportSummary).HasMaxLength(2000).IsRequired(false);
                entity.Property(e => e.ExpenseDetails).HasMaxLength(4000).IsRequired(false);
                entity.Property(e => e.ReportAttachmentUrl).HasMaxLength(500).IsRequired(false);
                entity.HasOne(e => e.Event)
                      .WithMany()
                      .HasForeignKey(e => e.EventId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Sponsor)
                      .WithMany()
                      .HasForeignKey(e => e.SponsorId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Organizer)
                      .WithMany()
                      .HasForeignKey(e => e.OrganizerId)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Creator)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Receiver)
                      .WithMany()
                      .HasForeignKey(e => e.ReceivedBy)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasOne(e => e.LegacyEventSponsor)
                      .WithMany()
                      .HasForeignKey(e => e.LegacyEventSponsorId)
                      .OnDelete(DeleteBehavior.Restrict)
                      .IsRequired(false);
                entity.HasIndex(e => new { e.EventId, e.Status });
                entity.HasIndex(e => new { e.SponsorId, e.Status });
                entity.HasIndex(e => new { e.OrganizerId, e.Status });
            });

            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(200).IsRequired(false);
                entity.Property(e => e.Message).HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.Type).HasMaxLength(50).IsRequired(false);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            SeedData(modelBuilder);
        }

        private void SeedData(ModelBuilder modelBuilder)
        {
            // Seed existing shop data
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "Electronics", Description = "Electronic devices and gadgets" },
                new Category { Id = 2, Name = "Clothing", Description = "Apparel and fashion items" },
                new Category { Id = 3, Name = "Books", Description = "Books and publications" },
                new Category { Id = 4, Name = "Home & Garden", Description = "Home and garden products" },
                new Category { Id = 5, Name = "Sports", Description = "Sports equipment and accessories" }
            );

            modelBuilder.Entity<Product>().HasData(
                new Product { Id = 1, Name = "Laptop Dell XPS 15", Price = 35000000, Stock = 10, CategoryId = 1, Description = "High-performance laptop", ImageUrl = "" },
                new Product { Id = 2, Name = "iPhone 15 Pro", Price = 28000000, Stock = 15, CategoryId = 1, Description = "Latest Apple smartphone", ImageUrl = "" },
                new Product { Id = 3, Name = "T-Shirt Cotton", Price = 250000, Stock = 100, CategoryId = 2, Description = "Comfortable cotton t-shirt", ImageUrl = "" },
                new Product { Id = 4, Name = "Programming Book", Price = 450000, Stock = 50, CategoryId = 3, Description = "Learn programming basics", ImageUrl = "" },
                new Product { Id = 5, Name = "Garden Tools Set", Price = 850000, Stock = 25, CategoryId = 4, Description = "Complete gardening toolkit", ImageUrl = "" }
            );

            // Seed users (4 roles) with fixed hashes to keep EF migrations stable
            var saltAdmin = new byte[] { 120, 8, 176, 127, 89, 181, 227, 27, 90, 188, 243, 26, 125, 173, 154, 156 };
            var saltOrg = new byte[] { 58, 34, 153, 111, 0, 143, 116, 1, 232, 193, 45, 121, 201, 7, 162, 24 };
            var saltSponsor = new byte[] { 88, 137, 43, 39, 44, 169, 150, 8, 184, 242, 30, 239, 47, 220, 116, 11 };
            var saltVol = new byte[] { 244, 33, 47, 59, 159, 253, 173, 49, 188, 35, 70, 197, 60, 118, 28, 219 };
            const string pwAdmin = "OFrMzZA23/L+t9awaL27ipv1+5s6PGPIS5EV7/aJO2E=";
            const string pwOrg = "lF5perLzkWzxV9EMfJSHtRNcwxMXabNtUJgZm2M6lnQ=";
            const string pwSponsor = "sHZuTXhqDKnIQEPxOA7P7dKH+4MzFUN/d1Vu9WphRZk=";
            const string pwVol = "5QlPWdlYiXJY7DyVkXMYW3r4rzAGOGP+LljErQueGcY=";

            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, UserName = "admin",     Password = pwAdmin,   Salt = saltAdmin,   Name = "Administrator",   Email = "admin@volunteerhub.vn",     IsActive = true, UserType = 3, Created = new DateTime(2024, 1, 1), Position = "Admin",     Contact = "", Image = "", Phone = "" },
                new User { Id = 2, UserName = "organizer", Password = pwOrg,     Salt = saltOrg,     Name = "Nguyen Van Minh", Email = "organizer@volunteerhub.vn", IsActive = true, UserType = 1, Created = new DateTime(2024, 1, 1), Position = "Organizer", Contact = "", Image = "", Phone = "" },
                new User { Id = 3, UserName = "sponsor",   Password = pwSponsor, Salt = saltSponsor, Name = "Tran Thi Lan",    Email = "sponsor@volunteerhub.vn",   IsActive = true, UserType = 2, Created = new DateTime(2024, 1, 1), Position = "Sponsor",   Contact = "", Image = "", Phone = "" },
                new User { Id = 4, UserName = "volunteer", Password = pwVol,     Salt = saltVol,     Name = "Le Van Hung",     Email = "volunteer@volunteerhub.vn", IsActive = true, UserType = 0, Created = new DateTime(2024, 1, 1), Position = "Volunteer", Contact = "", Image = "", Phone = "" }
            );

            modelBuilder.Entity<OrganizerVerification>().HasData(
                new OrganizerVerification
                {
                    Id = 1,
                    OrganizerId = 2,
                    OrganizationName = "Volunteer Hub Demo Club",
                    RepresentativeName = "Nguyen Van Minh",
                    ContactEmail = "organizer@volunteerhub.vn",
                    Phone = "",
                    Address = "Ha Noi",
                    WebsiteUrl = "",
                    Description = "Demo organizer account used for VolunteerHub review flows.",
                    DocumentUrl = "",
                    VerificationNote = "Seeded verified organizer for demo data.",
                    CommitmentAccepted = true,
                    Status = "Verified",
                    AdminNote = "Seed verified.",
                    RejectReason = "",
                    SubmittedAt = new DateTime(2024, 1, 1),
                    CreatedAt = new DateTime(2024, 1, 1),
                    VerifiedAt = new DateTime(2024, 1, 1),
                    VerifiedBy = 1
                }
            );

            // Seed skills
            modelBuilder.Entity<Skill>().HasData(
                new Skill { Id = 1, Name = "Y tế",              Category = "Chuyên môn" },
                new Skill { Id = 2, Name = "Giáo dục",          Category = "Chuyên môn" },
                new Skill { Id = 3, Name = "CNTT",              Category = "Chuyên môn" },
                new Skill { Id = 4, Name = "Hậu cần",           Category = "Vận hành" },
                new Skill { Id = 5, Name = "Truyền thông",      Category = "Vận hành" },
                new Skill { Id = 6, Name = "Ngoại ngữ",         Category = "Kỹ năng mềm" },
                new Skill { Id = 7, Name = "Lái xe",            Category = "Kỹ năng mềm" }
            );

            // Seed event categories
            modelBuilder.Entity<EventCategory>().HasData(
                new EventCategory { Id = 1, Name = "Trồng cây",           Description = "Hoạt động trồng và chăm sóc cây xanh",  Icon = "tree" },
                new EventCategory { Id = 2, Name = "Dọn rác",             Description = "Vệ sinh môi trường, thu gom rác thải",   Icon = "trash" },
                new EventCategory { Id = 3, Name = "Từ thiện",            Description = "Hỗ trợ người có hoàn cảnh khó khăn",     Icon = "heart" },
                new EventCategory { Id = 4, Name = "Bình dân học vụ số",  Description = "Dạy kỹ năng số cho cộng đồng",           Icon = "laptop" }
            );

            // Seed badges
            modelBuilder.Entity<Badge>().HasData(
                new Badge { Id = 1, Name = "Chiến sĩ xanh",         Description = "Tham gia sự kiện tình nguyện đầu tiên",     IconUrl = "", Condition = "{\"min_events\":1}" },
                new Badge { Id = 2, Name = "Đại sứ nhân ái",        Description = "Tích lũy 50 giờ tình nguyện",               IconUrl = "", Condition = "{\"min_hours\":50}" },
                new Badge { Id = 3, Name = "Chuyên gia tình nguyện", Description = "Tham gia 10 sự kiện & 100 giờ tình nguyện", IconUrl = "", Condition = "{\"min_events\":10,\"min_hours\":100}" }
            );

            // Seed volunteer profile cho volunteer user
            modelBuilder.Entity<VolunteerProfile>().HasData(
                new VolunteerProfile { Id = 1, UserId = 4, BloodType = "O", Interests = "Môi trường, Giáo dục", TotalVolunteerHours = 0, Bio = "Tình nguyện viên nhiệt huyết", AvatarUrl = "", KycStatus = "Verified", IdentityFrontImageUrl = "", IdentityBackImageUrl = "", PortraitImageUrl = "", KycAdminNote = "Seed verified." }
            );

            // Seed events
            modelBuilder.Entity<Entities.Event>().HasData(
                new Entities.Event
                {
                    Id = 1, Title = "Trồng cây xanh Hà Nội 2025", Description = "Chiến dịch trồng 1000 cây xanh tại các tuyến phố Hà Nội",
                    Location = "Hà Nội", Latitude = 21.0285m, Longitude = 105.8542m,
                    StartDate = new DateTime(2025, 8, 15, 7, 0, 0), EndDate = new DateTime(2025, 8, 15, 17, 0, 0),
                    MinParticipants = 10, MaxParticipants = 50, CurrentParticipants = 0, RequiresKyc = false, Status = "Pending",
                    CategoryId = 1, OrganizerId = 2, ImageUrl = "", QrCode = "", RequiredSkillIds = "[4]",
                    CreatedAt = new DateTime(2025, 7, 1)
                },
                new Entities.Event
                {
                    Id = 2, Title = "Dọn sạch bãi biển Đà Nẵng", Description = "Vệ sinh bãi biển Mỹ Khê và tuyên truyền bảo vệ môi trường biển",
                    Location = "Đà Nẵng", Latitude = 16.0544m, Longitude = 108.2022m,
                    StartDate = new DateTime(2025, 9, 5, 6, 0, 0), EndDate = new DateTime(2025, 9, 5, 12, 0, 0),
                    MinParticipants = 20, MaxParticipants = 100, CurrentParticipants = 1, RequiresKyc = false, Status = "Approved",
                    CategoryId = 2, OrganizerId = 2, ImageUrl = "", QrCode = "EVT-SEED-2-9f4c1b7d2e6a4c8ba5d0f3e1a2b7c6d5",
                    RequiredSkillIds = "[]", CreatedAt = new DateTime(2025, 7, 10)
                },
                new Entities.Event
                {
                    Id = 3, Title = "Dạy kỹ năng số cho người cao tuổi", Description = "Hướng dẫn người cao tuổi sử dụng điện thoại thông minh và internet",
                    Location = "TP. Hồ Chí Minh", Latitude = 10.8231m, Longitude = 106.6297m,
                    StartDate = new DateTime(2025, 6, 1, 8, 0, 0), EndDate = new DateTime(2025, 6, 30, 17, 0, 0),
                    MinParticipants = 5, MaxParticipants = 30, CurrentParticipants = 1, RequiresKyc = false, Status = "Completed",
                    CategoryId = 4, OrganizerId = 2, ImageUrl = "", QrCode = "EVT-SEED-3-6a1e5c9b0d4f43e8a7c2b5d9f1e0a3c4",
                    RequiredSkillIds = "[3,6]", CreatedAt = new DateTime(2025, 5, 1)
                }
            );

            // Seed channel cho event Approved và Completed
            modelBuilder.Entity<Channel>().HasData(
                new Channel { Id = 1, EventId = 2, Name = "Kênh trao đổi - Dọn sạch bãi biển Đà Nẵng",         CreatedAt = new DateTime(2025, 7, 11), IsActive = true },
                new Channel { Id = 2, EventId = 3, Name = "Kênh trao đổi - Dạy kỹ năng số cho người cao tuổi", CreatedAt = new DateTime(2025, 5, 2),  IsActive = true }
            );

            // Seed registration: volunteer tham gia event 2 và 3
            modelBuilder.Entity<Registration>().HasData(
                new Registration { Id = 1, EventId = 2, UserId = 4, Status = "Confirmed", RegisteredAt = new DateTime(2025, 7, 12), ConfirmedAt = new DateTime(2025, 7, 13), IsAttended = false, VolunteerHours = 0 },
                new Registration { Id = 2, EventId = 3, UserId = 4, Status = "Confirmed", RegisteredAt = new DateTime(2025, 5, 5),  ConfirmedAt = new DateTime(2025, 5, 6),  IsAttended = true,  AttendedAt = new DateTime(2025, 6, 1), VolunteerHours = 8 }
            );

            // Seed certificate cho event 3 (Completed)
            modelBuilder.Entity<Certificate>().HasData(
                new Certificate { Id = 1, UserId = 4, EventId = 3, CertificateCode = "CERT-2025-0001", IssuedAt = new DateTime(2025, 7, 1), VolunteerHours = 8, PdfUrl = "" }
            );

            // =============================================
            // VOLUNTEERHUB: SPONSOR PROFILE
            // =============================================

            modelBuilder.Entity<SponsorProfile>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OrganizationName).HasMaxLength(200).IsRequired(false);
                entity.Property(e => e.RepresentativeName).HasMaxLength(150).IsRequired(false);
                entity.Property(e => e.ContactEmail).HasMaxLength(150).IsRequired(false);
                entity.Property(e => e.Phone).HasMaxLength(30).IsRequired(false);
                entity.Property(e => e.Website).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.LogoUrl).HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.Description).HasMaxLength(2000).IsRequired(false);
                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.UserId).IsUnique();
            });

            // Seed sponsor profile for demo sponsor user (userId=3)
            modelBuilder.Entity<SponsorProfile>().HasData(
                new SponsorProfile
                {
                    Id = 1,
                    UserId = 3,
                    OrganizationName = "Công ty TNHH Tài trợ Demo",
                    RepresentativeName = "Nguyễn Văn Sponsor",
                    ContactEmail = "sponsor@demo.vn",
                    Phone = "0901234567",
                    Website = "https://sponsor-demo.vn",
                    LogoUrl = "",
                    Description = "Nhà tài trợ demo cho hệ thống VolunteerHub",
                    IsVerified = true,
                    CreatedAt = new DateTime(2025, 5, 1),
                    UpdatedAt = new DateTime(2025, 5, 1)
                }
            );
        }
    }
}
