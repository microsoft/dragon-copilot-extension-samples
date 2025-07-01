// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Text.Json;
using DragonBackendSimulator.Web.Configuration;
using DragonBackendSimulator.Web.Services;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;

namespace DragonBackendSimulator.Web.Extensions;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure options
        services.Configure<ExtensionApiOptions>(configuration.GetSection(ExtensionApiOptions.SectionName));

        // Register services
        services.AddScoped<IEncounterService, EncounterService>();

        // Add controllers and API explorer
        services.Configure<RouteOptions>(options => options.LowercaseUrls = true);
        services.AddControllers();
        services.AddEndpointsApiExplorer();

        // Add Swagger services
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Dragon Backend Simulator API",
                Version = "v1",
                Description = "REST API for creating and managing encounters that integrate with external extension APIs."
            });
        });

        // Configure HttpClient
        services.AddHttpClient("EncounterApi", (serviceProvider, client) =>
        {
            var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ExtensionApiOptions>>().Value;

            client.BaseAddress = options.BaseUrl;
            client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            client.DefaultRequestHeaders.Add("User-Agent", "DragonBackendSimulator/1.0");
        });

        services.AddSingleton(new JsonSerializerOptions(JsonSerializerDefaults.Web));

        return services;
    }
}
