// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SampleExtension.Web.Configuration;

namespace SampleExtension.Web.Services;

/// <summary>
/// Implementation of the authorization service that checks for a valid license key.
/// Expects the license key to be provided in a specific header.
/// </summary>
public class LicenseKeyAuthorizationService : IAuthorizationService
{
    private readonly AuthorizationOptions _options;
    private readonly ILogger<LicenseKeyAuthorizationService> _logger;

    /// <summary>
    /// Constructor for LicenseKeyAuthorizationService
    /// </summary>
    /// <param name="options">Authorization configuration options</param>
    /// <param name="logger">The logger</param>
    public LicenseKeyAuthorizationService(IOptions<AuthorizationOptions> options, ILogger<LicenseKeyAuthorizationService> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<AuthorizationResult> AuthorizeAsync(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!_options.LicenseKeyEnabled)
        {
            LogLicenseKeyDisabled(_logger, null);
            return Task.FromResult(AuthorizationResult.Success());
        }

        var licenseKey = request.Headers[_options.LicenseKeyHeader].FirstOrDefault();

        if (string.IsNullOrEmpty(licenseKey))
        {
            LogMissingLicenseKey(_logger, _options.LicenseKeyHeader, null);
            return Task.FromResult(AuthorizationResult.Failure($"Missing required header: {_options.LicenseKeyHeader}"));
        }

        var isValid = string.Equals(licenseKey, _options.ValidLicenseKey, StringComparison.Ordinal);

        if (!isValid)
        {
            LogInvalidLicenseKey(_logger, null);
            return Task.FromResult(AuthorizationResult.Failure("Invalid license key"));
        }

        LogLicenseKeyValid(_logger, null);
        return Task.FromResult(AuthorizationResult.Success());
    }

    #region High-performance logging
    private static readonly Action<ILogger, Exception?> LogLicenseKeyDisabled =
        LoggerMessage.Define(LogLevel.Debug, new EventId(1), "License key authorization is disabled");

    private static readonly Action<ILogger, string, Exception?> LogMissingLicenseKey =
        LoggerMessage.Define<string>(LogLevel.Warning, new EventId(2), "Missing license key header: {HeaderName}");

    private static readonly Action<ILogger, Exception?> LogInvalidLicenseKey =
        LoggerMessage.Define(LogLevel.Warning, new EventId(3), "Invalid license key provided");

    private static readonly Action<ILogger, Exception?> LogLicenseKeyValid =
        LoggerMessage.Define(LogLevel.Debug, new EventId(4), "License key validation successful");
    #endregion
}
