// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleExtension.Web.Configuration;

/// <summary>
/// Configuration options for authentication
/// </summary>
public class AuthenticationOptions
{
    /// <summary>
    /// The configuration section name
    /// </summary>
    public const string SectionName = "Authentication";

    /// <summary>
    /// Whether authentication is enabled
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Azure AD tenant ID
    /// </summary>
    public string? TenantId { get; set; }

    /// <summary>
    /// Expected audience for JWT tokens
    /// </summary>
    public string? Audience { get; set; }

    /// <summary>
    /// Azure AD instance (e.g., https://login.microsoftonline.com/)
    /// </summary>
    public string Instance { get; set; } = "https://login.microsoftonline.com/";

    /// <summary>
    /// Client ID for the application
    /// </summary>
    public string? ClientId { get; set; }
}
