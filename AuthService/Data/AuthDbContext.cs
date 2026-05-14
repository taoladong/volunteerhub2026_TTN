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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Id).ValueGeneratedOnAdd();
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Email).HasMaxLength(256);
            entity.Property(user => user.PasswordHash).HasMaxLength(512);
            entity.Property(user => user.FullName).HasMaxLength(256);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(role => role.Id);
            entity.Property(role => role.Id).ValueGeneratedOnAdd();
            entity.HasIndex(role => role.Name).IsUnique();
            entity.Property(role => role.Name).HasMaxLength(128);
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
            entity.Property(refreshToken => refreshToken.Token).HasMaxLength(512);

            entity.HasOne(refreshToken => refreshToken.User)
                .WithMany(user => user.RefreshTokens)
                .HasForeignKey(refreshToken => refreshToken.UserId);
        });

        modelBuilder.Entity<VolunteerProfile>(entity =>
        {
            entity.HasKey(profile => profile.Id);
            entity.Property(profile => profile.Id).ValueGeneratedOnAdd();
            entity.Property(profile => profile.PhoneNumber).HasMaxLength(11);
            entity.Property(profile => profile.Gender).HasMaxLength(5);
            entity.Property(profile => profile.Address).HasMaxLength(500);
            entity.Property(profile => profile.Bio).HasMaxLength(1000);
            entity.Property(profile => profile.AvatarUrl).HasMaxLength(512);

            entity.HasIndex(profile => profile.UserId).IsUnique();

            entity.HasOne(profile => profile.User)
                .WithOne(user => user.VolunteerProfile)
                .HasForeignKey<VolunteerProfile>(profile => profile.UserId);
        });
    }
}
