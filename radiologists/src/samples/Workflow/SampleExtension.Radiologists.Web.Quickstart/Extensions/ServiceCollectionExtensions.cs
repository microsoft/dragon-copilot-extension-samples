// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using AuthOptions = SampleExtension.Radiologists.Web.Quickstart.Configuration.AuthenticationOptions;

namespace SampleExtension.Radiologists.Web.Quickstart.Extensions;

/// <summary>
/// Extension methods for service collection configuration.
/// </summary>
public static class ServiceCollectionExtensions
{
    private static readonly ILoggerFactory _loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
    private static readonly ILogger _logger = _loggerFactory.CreateLogger(nameof(ServiceCollectionExtensions));

    /// <summary>
    /// Adds custom JWT authentication and claims-based authorization services.
    /// </summary>
    public static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var authOptions = configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>();

        // If authentication is disabled, add policies that always allow access
        if (authOptions?.Enabled != true)
        {
            _logger.LogWarning("JWT authentication is disabled. All requests will be allowed without token validation.");

            services.AddAuthorization(options =>
            {
                options.AddPolicy("RequiredClaims", policy =>
                    policy.RequireAssertion(_ => true));
            });

            return services;
        }

        // Add JWT authentication
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(configuration.GetSection(AuthOptions.SectionName));

        // Configure JWT Bearer events for diagnostics logging
        services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();

                    if (context.Exception is SecurityTokenInvalidAudienceException audienceException)
                    {
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
                                var expectedAudience = authOptions.ClientId ?? "null";

                                logger.LogWarning(
                                    audienceException,
                                    "JWT audience validation failed. Actual={ActualAudience}, Expected={ExpectedAudience}, Message={Message}",
                                    actualAudience,
                                    expectedAudience,
                                    audienceException.Message);
                            }
                            catch (ArgumentException ex)
                            {
                                logger.LogWarning(ex, "Failed to parse JWT token for diagnostics: {Message}", ex.Message);
                            }
                        }
                    }
                    else
                    {
                        logger.LogWarning(context.Exception, "JWT authentication failed: {Message}", context.Exception.Message);
                    }

                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<JwtBearerEvents>>();
                    var principal = context.Principal;

                    if (principal?.Identity?.IsAuthenticated == true)
                    {
                        logger.LogDebug("JWT token validated successfully.");

                        if (authOptions.RequiredClaims.Count != 0)
                        {
                            foreach (var requiredClaim in authOptions.RequiredClaims)
                            {
                                var actualValues = principal.Claims
                                    .Where(c => c.Type == requiredClaim.Key)
                                    .Select(c => c.Value);
                                logger.LogDebug(
                                    "Claim validation: {ClaimType} expected=[{Expected}] actual=[{Actual}]",
                                    requiredClaim.Key,
                                    string.Join(", ", requiredClaim.Value),
                                    string.Join(", ", actualValues));
                            }
                        }
                    }

                    return Task.CompletedTask;
                },
            };
        });

        // Add authorization with custom policies
        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequiredClaims", policy =>
            {
                policy.RequireAuthenticatedUser();

                if (authOptions.RequiredClaims.Count != 0)
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
    /// Registers configuration option classes for authentication.
    /// </summary>
    public static IServiceCollection AddSecurityOptions(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));

        return services;
    }
}
