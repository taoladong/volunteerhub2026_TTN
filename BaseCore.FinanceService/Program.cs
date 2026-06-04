using BaseCore.Common.Infrastructure;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Repository.Infrastructure;
using BaseCore.Services.VolunteerHub;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Threading.RateLimiting;

DotEnvLoader.LoadIfPresent(AppContext.BaseDirectory);
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var partitionKey = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "authenticated"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
    options.AddPolicy("read-sensitive", context =>
    {
        var partitionKey = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "authenticated"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
    options.AddPolicy("write-sensitive", context =>
    {
        var partitionKey = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "authenticated"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "VolunteerHub Finance Service",
        Version = "v1",
        Description = "Donation, sponsorship, financial tracking and financial export service"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddDbContext<MySqlDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});

builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<ISkillRepositoryEF, SkillRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IVolunteerProfileRepositoryEF, VolunteerProfileRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IEventCategoryRepositoryEF, EventCategoryRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IEventRepositoryEF, EventRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IWorkShiftRepositoryEF, WorkShiftRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IRegistrationRepositoryEF, RegistrationRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IChannelRepositoryEF, ChannelRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IPostRepositoryEF, PostRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<INotificationRepositoryEF, NotificationRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<ICertificateRepositoryEF, CertificateRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IRatingRepositoryEF, RatingRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IEventSponsorRepositoryEF, EventSponsorRepositoryEF>();

builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IBadgeService, BadgeService>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IRegistrationService, RegistrationService>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IChannelRealtimeNotifier, NullChannelRealtimeNotifier>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUserRepositoryEF, BaseCore.Repository.EFCore.UserRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.EFCore.IUnitOfWork, BaseCore.Repository.EFCore.UnitOfWork>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
    DatabaseMigrationRunner.RunWithProcessLock(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var userIdClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            var db = context.RequestServices.GetRequiredService<BaseCore.Repository.MySqlDbContext>();
            var isActive = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.IsActive)
                .FirstOrDefaultAsync();

            if (!isActive)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "Account is deactivated" });
                return;
            }
        }
    }
    await next();
});
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

Console.WriteLine("VolunteerHub Finance Service running on port 5004");
Console.WriteLine("Endpoints: /api/support-campaigns, /api/donations, /api/sponsorship-proposals, /api/sponsors, /api/admin/finance");
app.Run();



