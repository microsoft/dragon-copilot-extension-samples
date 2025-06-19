using DragonBackendSimulator.Web.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddApplicationServices(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
app.ConfigureRequestPipeline();

app.Run();
