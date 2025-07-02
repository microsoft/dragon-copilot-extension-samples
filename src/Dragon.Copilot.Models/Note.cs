// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Note data structure from Dragon Standard payload
/// </summary>
public class Note
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
    /// Language of the note
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>
    /// Priority of the note
    /// </summary>
    [JsonPropertyName("priority")]
    public string? Priority { get; set; }

    /// <summary>
    /// Encounter information
    /// </summary>
    [JsonPropertyName("encounter")]
    public Encounter? Encounter { get; set; }

    /// <summary>
    /// Sessions associated with the note
    /// </summary>
    [JsonPropertyName("sessions")]
    public IList<DragonSession>? Sessions { get; init; }

    /// <summary>
    /// Document information
    /// </summary>
    [JsonPropertyName("document")]
    public Document? Document { get; set; }

    /// <summary>
    /// Clinical document sections
    /// </summary>
    [JsonPropertyName("resources")]
    public IList<ClinicalDocumentSection>? Resources { get; init; }
}
