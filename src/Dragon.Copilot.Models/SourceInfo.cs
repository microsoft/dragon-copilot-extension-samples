// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Source information for medical codes
/// </summary>
public class SourceInfo
{
    /// <summary>
    /// Unique identifier for the source
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>
    /// Description of the source
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}
