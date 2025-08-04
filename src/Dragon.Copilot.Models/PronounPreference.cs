// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Pronoun preference information
/// </summary>
public class PronounPreference
{
    /// <summary>
    /// Description of the pronoun preference
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Identifier for the pronoun preference
    /// </summary>
    [JsonPropertyName("identifier")]
    public string? Identifier { get; set; }

    /// <summary>
    /// System reference for the pronoun preference
    /// </summary>
    [JsonPropertyName("system")]
    public string? System { get; set; }
}
