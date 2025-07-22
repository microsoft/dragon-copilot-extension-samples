// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;
using SampleExtension.Web.Configuration;
using SampleExtension.Web.Middleware;

namespace SampleExtension.Web.Extensions;

/// <summary>
/// Extension methods for configuring the web application
/// </summary>
internal static class WebApplicationExtensions
{
    /// <summary>
    /// Applies full security (JWT + License Key) to all non-public routes
    /// </summary>
    /// <param name="app">The web application</param>
    /// <returns>The web application</returns>
    internal static WebApplication UseFullSecurity(this WebApplication app)
    {
        // Apply both JWT authentication and license key validation to all non-public routes
        app.UseWhen(
            context => !KnownRoutes.IsPublicRoute(context.Request.Path.Value ?? string.Empty),
            protectedBranch =>
            {
                // First: JWT Authentication & Authorization
                protectedBranch.UseAuthentication();
                protectedBranch.UseAuthorization();

                // Second: License Key Validation (after JWT is validated)
                protectedBranch.UseMiddleware<LicenseKeyMiddleware>();
            });

        return app;
    }

    internal static WebApplicationBuilder AddSwaggerConfiguration(this WebApplicationBuilder webApplicationBuilder)
    {
        webApplicationBuilder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Sample Extension API",
                Version = "v1",
                Description = "A sample extension API that accepts posts from Dragon Copilot"
            });

            // Add JWT authentication to Swagger
            var authOptions = webApplicationBuilder.Configuration.GetSection(AuthenticationOptions.SectionName).Get<AuthenticationOptions>();
            if (authOptions?.Enabled == true)
            {
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            }

            // Add license key header to Swagger
            var licenseOptions = webApplicationBuilder.Configuration.GetSection(LicenseKeyOptions.SectionName).Get<LicenseKeyOptions>();
            if (licenseOptions?.Enabled == true)
            {
                c.AddSecurityDefinition("LicenseKey", new OpenApiSecurityScheme
                {
                    Description = $"License key header for protected routes. Example: \"{licenseOptions.HeaderName}: your-license-key\"",
                    Name = licenseOptions.HeaderName,
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "LicenseKey"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            }
        });

        return webApplicationBuilder;
    }
}
