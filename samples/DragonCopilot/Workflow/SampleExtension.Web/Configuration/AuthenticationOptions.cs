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
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// JWT token issuer
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Expected audience for JWT tokens
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Required claims that must be present in JWT tokens
    /// </summary>
    public IReadOnlyDictionary<string, List<string>> RequiredClaims { get; } = new Dictionary<string, List<string>>();

}
