// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Extensions.DependencyInjection;
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
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register application services
        services.AddScoped<IProcessingService, ProcessingService>();

        // Add any additional services here

        return services;
    }
}
