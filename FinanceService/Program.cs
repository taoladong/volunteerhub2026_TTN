using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Services.VolunteerHub;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<MySqlDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Server=localhost;Database=VolunteerHubDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"));

builder.Services.AddScoped<IEventSponsorRepositoryEF, EventSponsorRepositoryEF>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

builder.Services.AddScoped<FinanceService.Repositories.IEventSponsorRepositoryEF, FinanceService.Repositories.EventSponsorRepositoryEF>();
builder.Services.AddScoped<FinanceService.Services.IAuditLogService, FinanceService.Services.AuditLogService>();
builder.Services.AddScoped<FinanceService.Services.INotificationService, FinanceService.Services.NotificationService>();
builder.Services.AddScoped<FinanceService.Services.IBadgeService, FinanceService.Services.BadgeService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
