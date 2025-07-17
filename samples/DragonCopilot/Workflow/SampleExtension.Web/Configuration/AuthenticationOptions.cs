// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;

namespace SampleExtension.Web.Configuration;

/// <summary>
/// JWT Authentication configuration options
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
    public bool Enabled { get; set; }

    /// <summary>
    /// Tenant ID for the application
    /// </summary>
    public string TenantId { get; set; }

    /// <summary>
    /// Client ID for the application
    /// </summary>
    public string ClientId { get; set; }

    /// <summary>
    /// Login instance (e.g., "https://login.microsoftonline.com/")
    /// </summary>
    public string Instance { get; set; }

    /// <summary>
    /// Required claims that must be present in JWT tokens
    /// </summary>
    public IDictionary<string, HashSet<string>> RequiredClaims { get; } = new Dictionary<string, HashSet<string>>();
}
