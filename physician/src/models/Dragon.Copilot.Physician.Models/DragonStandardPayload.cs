// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Physician.Models;

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
    /// Version of the Dragon Extensibility API the request was produced with (e.g. 1.2.0)
    /// </summary>
    [JsonPropertyName("extensibilityApiVersion")]
    public string? ExtensibilityApiVersion { get; set; }

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

    /// <summary>
    /// Inputs without a typed property, keyed by the input name from the extension manifest
    /// (for example EHR context FHIR bundles, adaptive card content, or custom JSON).
    /// </summary>
    [JsonExtensionData]
#pragma warning disable CA2227 // JsonExtensionData requires a settable dictionary
    public IDictionary<string, JsonElement>? AdditionalInputs { get; set; }
#pragma warning restore CA2227
}
