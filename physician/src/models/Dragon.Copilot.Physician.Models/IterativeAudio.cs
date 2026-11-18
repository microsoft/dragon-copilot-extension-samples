// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Physician.Models;

/// <summary>
/// Iterative audio data structure
/// </summary>
public class IterativeAudio
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

    /// <summary>
    /// Recordings that make up the encounter audio
    /// </summary>
    [JsonPropertyName("recordings")]
    public IList<Recording>? Recordings { get; init; }

    /// <summary>
    /// The audio turn delivered by this request
    /// </summary>
    [JsonPropertyName("turn")]
    public AudioTurn? Turn { get; set; }
}
