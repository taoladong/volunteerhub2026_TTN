using BaseCore.Common.Infrastructure;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

DotEnvLoader.LoadIfPresent(AppContext.BaseDirectory);
var builder = WebApplication.CreateBuilder(args);

// Allow swapping the route map per environment (e.g. ocelot.docker.json for container hostnames)
// via env Ocelot__ConfigFile. Defaults to the local-development ocelot.json.
var ocelotConfigFile = builder.Configuration["Ocelot:ConfigFile"] ?? "ocelot.json";
builder.Configuration.AddJsonFile(ocelotConfigFile, optional: false, reloadOnChange: true);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
builder.Services.AddOcelot();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.MapWhen(
    context => context.Request.Path == "/health" || context.Request.Path == "/api/health",
    branch =>
    {
        branch.Run(async context =>
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                status = "Healthy",
                service = "ApiGateway",
                utc = DateTime.UtcNow
            });
        });
    });
app.MapHealthChecks("/health");
app.MapHealthChecks("/api/health");
await app.UseOcelot();

Console.WriteLine(@"
==============================================
 BaseCore API Gateway
 Gateway:          http://localhost:5000
 Identity Service: http://localhost:5002
 Event Service:    http://localhost:5003
 Finance Service:  http://localhost:5004
 Legacy Core:      http://localhost:5001
 Routes:           /api/auth, /api/profile, /api/admin/users -> Identity
                   /api/events, /api/event-categories, /api/certificates -> Event
                   /api/support-campaigns, /api/donations, /api/sponsorship-proposals -> Finance
                   /api/* fallback -> Legacy Core
==============================================
");

app.Run();
