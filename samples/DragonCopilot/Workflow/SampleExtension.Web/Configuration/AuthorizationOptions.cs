// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleExtension.Web.Configuration;

/// <summary>
/// Configuration options for authorization
/// </summary>
public class AuthorizationOptions
{
    /// <summary>
    /// The configuration section name
    /// </summary>
    public const string SectionName = "Authorization";

    /// <summary>
    /// Whether license key authorization is enabled
    /// </summary>
    public bool LicenseKeyEnabled { get; set; } = true;

    /// <summary>
    /// Valid license key value
    /// </summary>
    public string ValidLicenseKey { get; set; } = "valid";

    /// <summary>
    /// Header name for license key
    /// </summary>
    public string LicenseKeyHeader { get; set; } = "license-key";
}
