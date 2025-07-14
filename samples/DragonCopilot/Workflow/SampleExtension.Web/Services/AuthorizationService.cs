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
/// Implementation of the authorization service
/// </summary>
public class AuthorizationService : IAuthorizationService
{
    private readonly AuthorizationOptions _options;
    private readonly ILogger<AuthorizationService> _logger;

    /// <summary>
    /// Constructor for AuthorizationService
    /// </summary>
    /// <param name="options">Authorization configuration options</param>
    /// <param name="logger">The logger</param>
    public AuthorizationService(IOptions<AuthorizationOptions> options, ILogger<AuthorizationService> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<bool> IsAuthorizedAsync(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!_options.LicenseKeyEnabled)
        {
            LogLicenseKeyDisabled(_logger, null);
            return Task.FromResult(true);
        }

        var licenseKey = request.Headers[_options.LicenseKeyHeader].FirstOrDefault();
        
        if (string.IsNullOrEmpty(licenseKey))
        {
            LogMissingLicenseKey(_logger, _options.LicenseKeyHeader, null);
            return Task.FromResult(false);
        }

        var isValid = string.Equals(licenseKey, _options.ValidLicenseKey, StringComparison.Ordinal);
        
        if (!isValid)
        {
            LogInvalidLicenseKey(_logger, null);
        }
        else
        {
            LogLicenseKeyValid(_logger, null);
        }

        return Task.FromResult(isValid);
    }

    /// <inheritdoc />
    public Task<string?> GetAuthorizationFailureReasonAsync(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!_options.LicenseKeyEnabled)
        {
            return Task.FromResult<string?>(null);
        }

        var licenseKey = request.Headers[_options.LicenseKeyHeader].FirstOrDefault();
        
        if (string.IsNullOrEmpty(licenseKey))
        {
            return Task.FromResult<string?>($"Missing required header: {_options.LicenseKeyHeader}");
        }

        var isValid = string.Equals(licenseKey, _options.ValidLicenseKey, StringComparison.Ordinal);
        return Task.FromResult<string?>(isValid ? null : "Invalid license key");
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
