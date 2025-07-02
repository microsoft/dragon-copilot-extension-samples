// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Transcript data structure
/// </summary>
public class Transcript
{
    /// <summary>
    /// Payload version
    /// </summary>
    [JsonPropertyName("payload_version")]
    public string? PayloadVersion { get; set; }

    /// <summary>
    /// Schema version
    /// </summary>
    [JsonPropertyName("schema_version")]
    public string? SchemaVersion { get; set; }

    /// <summary>
    /// Language
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>
    /// Encounter information
    /// </summary>
    [JsonPropertyName("encounter")]
    public Encounter? Encounter { get; set; }
}
