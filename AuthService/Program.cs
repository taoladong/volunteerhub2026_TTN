using AuthService.Data;
using AuthService.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AuthDb")));
builder.Services.AddScoped<IPasswordHashingService, PasswordHashingService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services
    .AddAuthentication(JwtAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, JwtAuthenticationHandler>(JwtAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization();

var app = builder.Build();

if (builder.Configuration.GetValue<bool>("Database:EnsureCreatedOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "AuthService" }));

app.Run();
