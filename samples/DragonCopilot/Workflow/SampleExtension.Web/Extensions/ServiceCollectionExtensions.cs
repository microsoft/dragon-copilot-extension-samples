// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Linq;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.JsonWebTokens;
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

        // Configure JWT Bearer events to log audience validation failures
        services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();

                    if (context.Exception is SecurityTokenInvalidAudienceException audienceException)
                    {
                        // Extract token to get actual audience
                        var authHeader = context.Request.Headers["Authorization"].ToString();
                        string? token = null;
                        
                        if (!string.IsNullOrEmpty(authHeader) && 
                            AuthenticationHeaderValue.TryParse(authHeader, out var headerValue) &&
                            string.Equals(headerValue.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase))
                        {
                            token = headerValue.Parameter;
                        }
                        
                        if (!string.IsNullOrEmpty(token))
                        {
                            try
                            {
                                var handler = new JsonWebTokenHandler();
                                var jsonToken = handler.ReadJsonWebToken(token);
                                var actualAudience = jsonToken.GetClaim("aud")?.Value ?? "null";

                                // Get expected audience from configuration or JWT options
                                var expectedAudience = authOptions?.Audience;

                                logger.LogJwtAudienceValidationFailed(actualAudience, expectedAudience ?? "null", audienceException.Message, audienceException);
                            }
                            catch (ArgumentException ex)
                            {
                                logger.LogJwtTokenParsingFailed(ex.Message, ex);
                            }
                        }
                    }
                    else
                    {
                        logger.LogJwtAuthenticationFailed(context.Exception.Message, context.Exception);
                    }

                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();

                    // Log successful token validation and claims for debugging
                    var principal = context.Principal;
                    if (principal?.Identity?.IsAuthenticated == true)
                    {
                        logger.LogJwtTokenValidatedSuccessfully();

                        // Log audience claims
                        var audClaims = principal.Claims?.Where(c => c.Type == "aud")?.Select(c => c.Value) ?? Enumerable.Empty<string>();
                        logger.LogTokenAudiences(string.Join(", ", audClaims));

                        // Log required claims for authorization debugging
                        if (authOptions?.RequiredClaims.Any() == true)
                        {
                            foreach (var requiredClaim in authOptions.RequiredClaims)
                            {
                                var actualValues = principal.Claims?.Where(c => c.Type == requiredClaim.Key)?.Select(c => c.Value) ?? Enumerable.Empty<string>();
                                var expectedValues = string.Join(", ", requiredClaim.Value);
                                var actualValuesStr = string.Join(", ", actualValues);

                                logger.LogClaimValidation(requiredClaim.Key, expectedValues, actualValuesStr);
                            }
                        }
                        else
                        {
                            logger.LogNoRequiredClaimsConfigured();
                        }
                    }

                    return Task.CompletedTask;
                }
            };
        });

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
