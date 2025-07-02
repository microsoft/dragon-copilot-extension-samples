// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Name details for a person
/// </summary>
public class NameDetails
{
    /// <summary>
    /// Given name
    /// </summary>
    [JsonPropertyName("given_name")]
    public string? GivenName { get; set; }

    /// <summary>
    /// Family name
    /// </summary>
    [JsonPropertyName("family_name")]
    public string? FamilyName { get; set; }
}
