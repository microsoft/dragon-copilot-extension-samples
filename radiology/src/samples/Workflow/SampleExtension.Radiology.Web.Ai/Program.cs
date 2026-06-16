// Minimal, self-contained Radiology extension sample.
// Partners can copy this project folder and run it with `dotnet run`.

using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using SampleExtension.Radiology.Web.Ai.Configuration;
using SampleExtension.Radiology.Web.Ai.Extensions;
using SampleExtension.Radiology.Web.Ai.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// OpenAI configuration
builder.Services.Configure<OpenAiSettings>(builder.Configuration.GetSection(OpenAiSettings.SectionName));

// Foundry Local (on-device model) configuration. Used as a fallback when Azure OpenAI is not configured.
builder.Services.Configure<FoundryLocalSettings>(builder.Configuration.GetSection(FoundryLocalSettings.SectionName));

// Services
builder.Services.AddSingleton<IAzureOpenAIService, AzureOpenAIService>();
builder.Services.AddSingleton<IFoundryLocalService, FoundryLocalService>();
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

// Health probes return a JSON body (e.g. {"status":"Healthy"}) so monitoring
// tools can parse the result rather than reading a plain-text string.
var healthCheckOptions = new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { status = report.Status.ToString() }).ConfigureAwait(false);
    },
};

app.MapHealthChecks("/health/liveness", healthCheckOptions);
app.MapHealthChecks("/health/readiness", healthCheckOptions);

// Apply JWT authentication to all non-public routes
app.UseFullSecurity();

app.MapControllers();

app.Run();
