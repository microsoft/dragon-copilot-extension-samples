// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Linq;

namespace SampleExtension.Web.Configuration;

/// <summary>
/// Known routes in the application
/// </summary>
public static class KnownRoutes
{
    /// <summary>
    /// Public routes (no authentication or license key required)
    /// </summary>
    private const string Health = "/health";           // Mapped in Program.cs
    private const string HealthV1 = "/v1/health";      // Controller endpoint
    private const string Swagger = "/index.html";       // Swagger UI endpoint

    /// <summary>
    /// Array of public routes
    /// </summary>
    private static readonly string[] PublicRoutes = [Health, HealthV1, Swagger];

    /// <summary>
    /// Determines if a route is public (no security required)
    /// </summary>
    /// <param name="path">The request path</param>
    /// <returns>True if the route is public, false otherwise</returns>
    public static bool IsPublicRoute(string path)
    {
        return PublicRoutes.Any(route =>
            path.StartsWith(route, StringComparison.InvariantCultureIgnoreCase));
    }
}
