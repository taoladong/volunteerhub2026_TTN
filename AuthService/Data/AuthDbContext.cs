using AuthService.Entities;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Data;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<VolunteerProfile> VolunteerProfiles => Set<VolunteerProfile>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<VolunteerSkill> VolunteerSkills => Set<VolunteerSkill>();
    public DbSet<KycSubmission> KycSubmissions => Set<KycSubmission>();
    public DbSet<OrganizerVerification> OrganizerVerifications => Set<OrganizerVerification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Id).ValueGeneratedOnAdd();
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Email).HasMaxLength(256).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(user => user.FullName).HasMaxLength(256).IsRequired();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(role => role.Id);
            entity.Property(role => role.Id).ValueGeneratedOnAdd();
            entity.HasIndex(role => role.Name).IsUnique();
            entity.Property(role => role.Name).HasMaxLength(128).IsRequired();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(userRole => new { userRole.UserId, userRole.RoleId });

            entity.HasOne(userRole => userRole.User)
                .WithMany(user => user.UserRoles)
                .HasForeignKey(userRole => userRole.UserId);

            entity.HasOne(userRole => userRole.Role)
                .WithMany(role => role.UserRoles)
                .HasForeignKey(userRole => userRole.RoleId);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(refreshToken => refreshToken.Id);
            entity.Property(refreshToken => refreshToken.Id).ValueGeneratedOnAdd();
            entity.HasIndex(refreshToken => refreshToken.Token).IsUnique();
            entity.Property(refreshToken => refreshToken.Token).HasMaxLength(512).IsRequired();

            entity.HasOne(refreshToken => refreshToken.User)
                .WithMany(user => user.RefreshTokens)
                .HasForeignKey(refreshToken => refreshToken.UserId);
        });

        modelBuilder.Entity<VolunteerProfile>(entity =>
        {
            entity.HasKey(profile => profile.Id);
            entity.Property(profile => profile.Id).ValueGeneratedOnAdd();
            entity.Property(profile => profile.PhoneNumber).HasMaxLength(20);
            entity.Property(profile => profile.Gender).HasMaxLength(32);
            entity.Property(profile => profile.Address).HasMaxLength(500);
            entity.Property(profile => profile.Bio).HasMaxLength(1000);
            entity.Property(profile => profile.AvatarUrl).HasMaxLength(512);

            entity.HasIndex(profile => profile.UserId).IsUnique();

            entity.HasOne(profile => profile.User)
                .WithOne(user => user.VolunteerProfile)
                .HasForeignKey<VolunteerProfile>(profile => profile.UserId);
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(skill => skill.Id);
            entity.Property(skill => skill.Id).ValueGeneratedOnAdd();
            entity.HasIndex(skill => skill.Name).IsUnique();
            entity.Property(skill => skill.Name).HasMaxLength(128).IsRequired();
            entity.Property(skill => skill.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<VolunteerSkill>(entity =>
        {
            entity.HasKey(volunteerSkill => new { volunteerSkill.VolunteerProfileId, volunteerSkill.SkillId });
            entity.Property(volunteerSkill => volunteerSkill.Note).HasMaxLength(500);

            entity.HasOne(volunteerSkill => volunteerSkill.VolunteerProfile)
                .WithMany(profile => profile.VolunteerSkills)
                .HasForeignKey(volunteerSkill => volunteerSkill.VolunteerProfileId);

            entity.HasOne(volunteerSkill => volunteerSkill.Skill)
                .WithMany(skill => skill.VolunteerSkills)
                .HasForeignKey(volunteerSkill => volunteerSkill.SkillId);
        });

        modelBuilder.Entity<KycSubmission>(entity =>
        {
            entity.HasKey(submission => submission.Id);
            entity.Property(submission => submission.Id).ValueGeneratedOnAdd();
            entity.Property(submission => submission.LegalFullName).HasMaxLength(256).IsRequired();
            entity.Property(submission => submission.IdentityNumber).HasMaxLength(64).IsRequired();
            entity.Property(submission => submission.DocumentFrontUrl).HasMaxLength(512);
            entity.Property(submission => submission.DocumentBackUrl).HasMaxLength(512);
            entity.Property(submission => submission.ReviewNote).HasMaxLength(1000);

            entity.HasOne(submission => submission.VolunteerProfile)
                .WithMany(profile => profile.KycSubmissions)
                .HasForeignKey(submission => submission.VolunteerProfileId);

            entity.HasOne(submission => submission.ReviewedByUser)
                .WithMany()
                .HasForeignKey(submission => submission.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OrganizerVerification>(entity =>
        {
            entity.HasKey(verification => verification.Id);
            entity.Property(verification => verification.Id).ValueGeneratedOnAdd();
            entity.Property(verification => verification.OrganizationName).HasMaxLength(256).IsRequired();
            entity.Property(verification => verification.LegalRepresentativeName).HasMaxLength(256);
            entity.Property(verification => verification.TaxCode).HasMaxLength(64);
            entity.Property(verification => verification.Address).HasMaxLength(500);
            entity.Property(verification => verification.WebsiteUrl).HasMaxLength(512);
            entity.Property(verification => verification.DocumentUrl).HasMaxLength(512);
            entity.Property(verification => verification.ReviewNote).HasMaxLength(1000);

            entity.HasIndex(verification => verification.UserId).IsUnique();

            entity.HasOne(verification => verification.User)
                .WithOne(user => user.OrganizerVerification)
                .HasForeignKey<OrganizerVerification>(verification => verification.UserId);

            entity.HasOne(verification => verification.ReviewedByUser)
                .WithMany()
                .HasForeignKey(verification => verification.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
