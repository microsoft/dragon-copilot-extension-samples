// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.AspNetCore.Builder;
using SampleExtension.Web.Configuration;
using SampleExtension.Web.Middleware;

namespace SampleExtension.Web.Extensions;

/// <summary>
/// Extension methods for configuring the web application
/// </summary>
public static class WebApplicationExtensions
{
    /// <summary>
    /// Applies full security (JWT + License Key) to all non-public routes
    /// </summary>
    /// <param name="app">The web application</param>
    /// <returns>The web application</returns>
    public static WebApplication UseFullSecurity(this WebApplication app)
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
}
