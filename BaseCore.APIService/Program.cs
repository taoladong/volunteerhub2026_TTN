using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.Common.Infrastructure;
using BaseCore.Repository;
using BaseCore.Repository.Infrastructure;
using BaseCore.Repository.EFCore;
using BaseCore.Services.VolunteerHub;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using System.Text;

DotEnvLoader.LoadIfPresent(AppContext.BaseDirectory);
var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();
builder.Services.AddVolunteerHubCache(builder.Configuration);
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
                PermitLimit = 6,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });
});

// Swagger Configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BaseCore API Service",
        Version = "v1",
        Description = "Business Logic Microservice - Products, Categories, Orders (Bài 10, 11)"
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

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

//MySQL Configuration with EF Core
//var connectionString = builder.Configuration.GetConnectionString("MySQL")
//    ?? "Server=localhost;Database=BaseCoreSales;User=root;Password=;";
//builder.Services.AddDbContext<MySqlDbContext>(options =>
//    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));



builder.Services.AddDbContext<MySqlDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});


// Repository Registration - Products, Categories, Orders
builder.Services.AddScoped<IProductRepositoryEF, ProductRepositoryEF>();
builder.Services.AddScoped<ICategoryRepositoryEF, CategoryRepositoryEF>();
builder.Services.AddScoped<IOrderRepositoryEF, OrderRepositoryEF>();
builder.Services.AddScoped<IOrderDetailRepositoryEF, OrderDetailRepositoryEF>();

// Repository Registration - VolunteerHub
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

// Service Registration - VolunteerHub
builder.Services.AddHttpClient();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IBadgeService, BadgeService>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IRegistrationService, RegistrationService>();
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<IChannelRealtimeNotifier, NullChannelRealtimeNotifier>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();

// JWT Authentication
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

// Auto migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
    DatabaseMigrationRunner.RunWithProcessLock(db);
}

// Configure the HTTP request pipeline
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
        var userIdValue = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdValue, out var userId))
        {
            var db = context.RequestServices.GetRequiredService<MySqlDbContext>();
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

Console.WriteLine("BaseCore API Service running on port 5001");
Console.WriteLine("Endpoints: /api/products, /api/categories, /api/orders, /api/events, /api/channels, ...");
app.Run();
