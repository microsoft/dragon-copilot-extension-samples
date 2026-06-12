// Minimal, self-contained Radiology extension sample.
// Partners can copy this project folder and run it with `dotnet run`.

using SampleExtension.Radiology.Web.Quickstart.Extensions;
using SampleExtension.Radiology.Web.Quickstart.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddSingleton<IQualityCheckService, QualityCheckService>();

// JWT authentication (Microsoft Entra ID).
// Toggle on/off via the "Authentication" config section.
builder.Services.AddCustomAuthentication(builder.Configuration);
builder.Services.AddSecurityOptions(builder.Configuration);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "Simple Radiology Extension API",
        Version = "v1",
        Description = "A simple radiology extension sample that demonstrates the extension pattern for Dragon Copilot."
    });
});
builder.Services.AddHealthChecks();

// CORS is fully open here for easy local testing. Make sure to restrict this for production.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Simple Radiology Extension API v1");
        c.RoutePrefix = string.Empty; // Serve Swagger UI at the app's root.
    });
}

app.MapHealthChecks("/health/liveness");
app.MapHealthChecks("/health/readiness");

// Apply JWT authentication to all non-public routes
app.UseFullSecurity();

app.MapControllers();

app.Run();
