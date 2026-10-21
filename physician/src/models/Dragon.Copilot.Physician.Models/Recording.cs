// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Physician.Models;

/// <summary>
/// A recording captured during the encounter
/// </summary>
public class Recording
{
    /// <summary>
    /// Recording identifier
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>
    /// Index of the first turn in this recording
    /// </summary>
    [JsonPropertyName("first_turn")]
    public int? FirstTurn { get; set; }

    /// <summary>
    /// Index of the last turn in this recording
    /// </summary>
    [JsonPropertyName("last_turn")]
    public int? LastTurn { get; set; }

    /// <summary>
    /// Recording length
    /// </summary>
    [JsonPropertyName("length")]
    public string? Length { get; set; }

    /// <summary>
    /// Recording creation timestamp
    /// </summary>
    [JsonPropertyName("creation_date")]
    public DateTime? CreationDate { get; set; }

    /// <summary>
    /// Locales spoken in the recording (e.g. en-US)
    /// </summary>
    [JsonPropertyName("recording_locales")]
    public IList<string>? RecordingLocales { get; init; }
}
