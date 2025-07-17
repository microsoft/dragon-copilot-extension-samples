// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Linq;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.Tokens;
using SampleExtension.Web.Configuration;
using SampleExtension.Web.Services;

namespace SampleExtension.Web.Extensions;

/// <summary>
/// Extension methods for service collection configuration
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds custom authentication services
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">The configuration</param>
    /// <returns>The service collection</returns>
    public static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var authOptions = configuration.GetSection(AuthenticationOptions.SectionName).Get<AuthenticationOptions>();

        // If authentication is disabled, add policies that always allow access
        if (authOptions?.Enabled != true)
        {
            services.AddAuthorization(options =>
            {
                options.AddPolicy("RequiredClaims", policy =>
                    policy.RequireAssertion(_ => true)); // Always allow
            });

            return services;
        }

        // Add JWT authentication
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(configuration.GetSection(AuthenticationOptions.SectionName));

        // Add authorization with custom policies
        services.AddAuthorization(options =>
        {
            // Enhanced policy with claims/roles/scopes
            options.AddPolicy("RequiredClaims", policy =>
            {
                policy.RequireAuthenticatedUser();

                // Add required claims
                if (authOptions.RequiredClaims.Any())
                {
                    foreach (var claim in authOptions.RequiredClaims)
                    {
                        policy.RequireClaim(claim.Key, claim.Value);
                    }
                }
            });
        });

        return services;
    }

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

        // Configure options
        services.Configure<AuthenticationOptions>(configuration.GetSection(AuthenticationOptions.SectionName));
        services.Configure<LicenseKeyOptions>(configuration.GetSection(LicenseKeyOptions.SectionName));

        return services;
    }
}
