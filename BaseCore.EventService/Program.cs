using BaseCore.Common.Infrastructure;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.Repository.Infrastructure;
using BaseCore.Services.VolunteerHub;
using BaseCore.EventService.Hubs;
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

// Redis-backed distributed cache (falls back to in-memory when Redis is not configured).
var redisConnectionString = builder.Services.AddVolunteerHubCache(builder.Configuration);

// SignalR + optional Redis backplane so realtime works across multiple EventService instances.
var signalRBuilder = builder.Services.AddSignalR();
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    signalRBuilder.AddStackExchangeRedis(redisConnectionString, options =>
    {
        options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("vhub-signalr");
    });
}

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
    options.AddPolicy("checkin-sensitive", context =>
    {
        var partitionKey = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "authenticated"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "VolunteerHub Event Service",
        Version = "v1",
        Description = "Event, registration, operation, certificate and event analytics service"
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

// Allowed origins are configurable for production (env Cors__AllowedOrigins, comma/semicolon separated).
// SignalR requires AllowCredentials, which forbids a wildcard origin, so we keep an explicit list.
var corsOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000,http://127.0.0.1:3000")
    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddDbContext<MySqlDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});

builder.Services.AddScoped<IProductRepositoryEF, ProductRepositoryEF>();
builder.Services.AddScoped<ICategoryRepositoryEF, CategoryRepositoryEF>();
builder.Services.AddScoped<IOrderRepositoryEF, OrderRepositoryEF>();
builder.Services.AddScoped<IOrderDetailRepositoryEF, OrderDetailRepositoryEF>();
builder.Services.AddScoped<ISkillRepositoryEF, SkillRepositoryEF>();
builder.Services.AddScoped<IVolunteerProfileRepositoryEF, VolunteerProfileRepositoryEF>();
builder.Services.AddScoped<IEventCategoryRepositoryEF, EventCategoryRepositoryEF>();
builder.Services.AddScoped<IEventRepositoryEF, EventRepositoryEF>();
builder.Services.AddScoped<IWorkShiftRepositoryEF, WorkShiftRepositoryEF>();
builder.Services.AddScoped<IRegistrationRepositoryEF, RegistrationRepositoryEF>();
builder.Services.AddScoped<IChannelRepositoryEF, ChannelRepositoryEF>();
builder.Services.AddScoped<IPostRepositoryEF, PostRepositoryEF>();
builder.Services.AddScoped<INotificationRepositoryEF, NotificationRepositoryEF>();
builder.Services.AddScoped<ICertificateRepositoryEF, CertificateRepositoryEF>();
builder.Services.AddScoped<IRatingRepositoryEF, RatingRepositoryEF>();
builder.Services.AddScoped<IEventSponsorRepositoryEF, EventSponsorRepositoryEF>();

builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IBadgeService, BadgeService>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IRegistrationService, RegistrationService>();
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<IChannelRealtimeNotifier, SignalRChannelRealtimeNotifier>();
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
    x.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
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
app.MapHub<ChannelHub>("/hubs/channel");
app.MapHealthChecks("/health");

Console.WriteLine("VolunteerHub Event Service running on port 5003");
Console.WriteLine("Endpoints: /api/events, /api/event-categories, /api/certificates, /api/channels, /api/dashboard");
app.Run();
