// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Web;
using SampleExtension.Web.Configuration;
using SampleExtension.Web.Services;

namespace SampleExtension.Web.Extensions;

/// <summary>
/// Extension methods for service collection configuration
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds application services to the dependency injection container
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">The configuration</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        // Register application services
        services.AddScoped<IProcessingService, ProcessingService>();
        services.AddScoped<IAuthorizationService, LicenseKeyAuthorizationService>();

        // Configure options
        services.Configure<AuthenticationOptions>(configuration.GetSection(AuthenticationOptions.SectionName));
        services.Configure<AuthorizationOptions>(configuration.GetSection(AuthorizationOptions.SectionName));

        return services;
    }

    /// <summary>
    /// Adds authentication services using Microsoft Identity Web
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">The configuration</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var authSection = configuration.GetSection(AuthenticationOptions.SectionName);
        var authOptions = authSection.Get<AuthenticationOptions>();

        if (authOptions?.Enabled == true)
        {
            // Use Microsoft.Identity.Web for Azure AD authentication
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddMicrosoftIdentityWebApi(authSection);
        }

        return services;
    }
}
