// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleConversational.OpenApi.Web.Configuration;

/// <summary>
/// Microsoft Entra ID (JWT) authentication options.
/// </summary>
public sealed class AuthenticationOptions
{
    /// <summary>
    /// The configuration section name.
    /// </summary>
    public const string SectionName = "Authentication";

    /// <summary>
    /// Whether JWT authentication is enforced. Disable only for local development.
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Tenant ID of the extension's app registration.
    /// </summary>
    public string? TenantId { get; set; }

    /// <summary>
    /// Client (application) ID of the extension's app registration, used as the token audience.
    /// </summary>
    public string? ClientId { get; set; }

    /// <summary>
    /// Login instance.
    /// </summary>
    public string Instance { get; set; } = "https://login.microsoftonline.com/";

    /// <summary>
    /// Claims that must be present in incoming tokens.
    /// </summary>
    public IDictionary<string, HashSet<string>> RequiredClaims { get; } = new Dictionary<string, HashSet<string>>();
}
