// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SampleExtension.Web.Configuration;

namespace SampleExtension.Web.Middleware;

/// <summary>
/// License key validation middleware
/// Only applied to protected routes (non-public routes)
/// </summary>
public class LicenseKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly LicenseKeyOptions _licenseKeyOptions;
    private readonly ILogger<LicenseKeyMiddleware> _logger;

    /// <summary>
    /// Constructor for LicenseKeyMiddleware
    /// </summary>
    /// <param name="next">The next middleware in the pipeline</param>
    /// <param name="options">License key options</param>
    /// <param name="logger">Logger</param>
    public LicenseKeyMiddleware(RequestDelegate next, IOptions<LicenseKeyOptions> options, ILogger<LicenseKeyMiddleware> logger)
    {
        ArgumentNullException.ThrowIfNull(next, nameof(next));
        ArgumentNullException.ThrowIfNull(options?.Value, nameof(options));

        _next = next;
        _licenseKeyOptions = options.Value;
        _logger = logger;
    }

    /// <summary>
    /// Invokes the middleware
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>A task</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context, nameof(context));

        // Skip if license key validation is globally disabled
        if (!_licenseKeyOptions.Enabled)
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        var licenseKey = context.Request.Headers[_licenseKeyOptions.HeaderName].FirstOrDefault();

        if (string.IsNullOrEmpty(licenseKey) || !_licenseKeyOptions.ValidKeys.Contains(licenseKey))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                error = "Invalid or missing license key",
                timestamp = DateTime.UtcNow
            };

            var jsonResponse = JsonSerializer.Serialize(response, JsonSerializerOptions.Web);

            await context.Response.WriteAsync(jsonResponse).ConfigureAwait(false);
            return;
        }

        // Store validated license key in context for potential use downstream
        context.Items["ValidatedLicenseKey"] = licenseKey;

        await _next(context).ConfigureAwait(false);
    }
}
