// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleExtension.Radiologists.Web.Ai.Extensions;

/// <summary>
/// Extension methods for configuring the web application security pipeline.
/// </summary>
internal static class WebApplicationExtensions
{
    private static readonly string[] PublicRoutes = ["/health", "/v1/health", "/index.html"];

    /// <summary>
    /// Applies JWT authentication and authorization to all non-public routes.
    /// </summary>
    internal static WebApplication UseFullSecurity(this WebApplication app)
    {
        app.UseWhen(
            context => !PublicRoutes.Any(r => (context.Request.Path.Value ?? string.Empty).StartsWith(r, StringComparison.OrdinalIgnoreCase)),
            protectedBranch =>
            {
                protectedBranch.UseAuthentication();
                protectedBranch.UseAuthorization();
            });

        return app;
    }
}
