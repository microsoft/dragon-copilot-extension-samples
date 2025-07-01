// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Dragon Standard payload containing session data, and note, transcript, iterative transcript and / or iterative audio data
/// </summary>
public class DragonStandardPayload
{
    /// <summary>
    /// Session data for the payload
    /// </summary>
    [JsonPropertyName("sessionData")]
    public required SessionData SessionData { get; set; }

    /// <summary>
    /// Note data if present
    /// </summary>
    [JsonPropertyName("note")]
    public Note? Note { get; set; }

    /// <summary>
    /// Transcript data if present
    /// </summary>
    [JsonPropertyName("transcript")]
    public Transcript? Transcript { get; set; }

    /// <summary>
    /// Iterative transcript data if present
    /// </summary>
    [JsonPropertyName("iterativeTranscript")]
    public IterativeTranscript? IterativeTranscript { get; set; }

    /// <summary>
    /// Iterative audio data if present
    /// </summary>
    [JsonPropertyName("iterativeAudio")]
    public IterativeAudio? IterativeAudio { get; set; }
}
