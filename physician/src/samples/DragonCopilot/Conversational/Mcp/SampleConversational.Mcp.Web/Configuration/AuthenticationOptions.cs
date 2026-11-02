// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleConversational.Mcp.Web.Configuration;

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
    /// Whether JWT authentication is enforced. Defaults to <see langword="true"/>. Setting it to
    /// <see langword="false"/> takes effect only in the Development environment.
    /// </summary>
    public bool Enabled { get; set; } = true;

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

    /// <summary>
    /// Application (client) IDs allowed to call this extension, matched against the token's
    /// <c>azp</c> (v2.0) or <c>appid</c> (v1.0) claim. Required when authentication is enabled.
    /// </summary>
    public IList<string> AllowedCallerAppIds { get; } = [];
}