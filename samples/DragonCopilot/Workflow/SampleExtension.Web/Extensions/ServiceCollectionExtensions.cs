// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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

        // Configure JWT bearer events for better logging
        services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetService<ILogger<JwtBearerHandler>>();
                    if (logger != null)
                    {
                        var exceptionType = context.Exception.GetType().Name;
                        
                        #pragma warning disable CA1848 // Use the LoggerMessage delegates
                        logger.LogError("JWT Authentication failed: {ExceptionType} - {Message}", 
                            exceptionType, context.Exception.Message);
                        #pragma warning restore CA1848

                        // Special handling for audience validation failures
                        if (context.Exception is SecurityTokenInvalidAudienceException)
                        {
                            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
                            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                            {
                                var token = authHeader["Bearer ".Length..];
                                try
                                {
                                    var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                                    var jsonToken = handler.ReadJwtToken(token);
                                    var actualAudience = jsonToken.Audiences.FirstOrDefault() ?? "not-present";
                                    var expectedAudience = authOptions?.Audience ?? "not-configured";
                                    
                                    #pragma warning disable CA1848 // Use the LoggerMessage delegates
                                    logger.LogError("JWT Audience validation failed. Expected: '{ExpectedAudience}', Actual: '{ActualAudience}'", 
                                        expectedAudience, actualAudience);
                                    #pragma warning restore CA1848
                                }
                                catch (ArgumentException ex)
                                {
                                    #pragma warning disable CA1848 // Use the LoggerMessage delegates
                                    logger.LogError(ex, "Failed to parse JWT token for audience debugging");
                                    #pragma warning restore CA1848
                                }
                            }
                        }
                    }
                    return System.Threading.Tasks.Task.CompletedTask;
                }
            };
        });

        // Add authorization with custom policies
        services.AddAuthorization(options =>
        {
            // Enhanced policy with claims validation for service-to-service calls
            options.AddPolicy("RequiredClaims", policy =>
            {
                policy.RequireAssertion(context =>
                {
                    // Check if the user is authenticated (has a valid JWT)
                    if (context.User?.Identity?.IsAuthenticated != true)
                    {
                        return false;
                    }

                    // Validate all required claims
                    if (authOptions.RequiredClaims.Any())
                    {
                        foreach (var requiredClaim in authOptions.RequiredClaims)
                        {
                            var claimValue = context.User.FindFirst(requiredClaim.Key)?.Value;
                            if (string.IsNullOrEmpty(claimValue) || !requiredClaim.Value.Contains(claimValue))
                            {
                                return false;
                            }
                        }
                    }

                    return true;
                });
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
