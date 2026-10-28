// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Physician.Models;

/// <summary>
/// A single speaker turn of iterative audio
/// </summary>
public class AudioTurn
{
    /// <summary>
    /// Turn index within the encounter
    /// </summary>
    [JsonPropertyName("index")]
    public int Index { get; set; }

    /// <summary>
    /// Speaker of the turn (e.g. Clinician)
    /// </summary>
    [JsonPropertyName("speaker")]
    public string? Speaker { get; set; }

    /// <summary>
    /// Base64-encoded audio data
    /// </summary>
    [JsonPropertyName("audio")]
    public string? Audio { get; set; }

    /// <summary>
    /// Turn start offset (e.g. 00:00:00.000)
    /// </summary>
    [JsonPropertyName("start_time")]
    public string? StartTime { get; set; }

    /// <summary>
    /// Turn end offset (e.g. 00:00:14.940)
    /// </summary>
    [JsonPropertyName("end_time")]
    public string? EndTime { get; set; }

    /// <summary>
    /// True for the final turn of the encounter, so the extension knows no more audio will follow
    /// </summary>
    [JsonPropertyName("is_last")]
    public bool IsLast { get; set; }
}
