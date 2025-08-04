// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// External identifier with type information
/// </summary>
public class ExternalIdentifier
{
    /// <summary>
    /// The external identifier value (required)
    /// </summary>
    [JsonPropertyName("identifier")]
    public required string Identifier { get; set; }

    /// <summary>
    /// The type of the external identifier (required)
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; set; }
}
