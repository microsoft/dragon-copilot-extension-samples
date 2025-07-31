using System.Collections.Generic;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Provenance information item
/// </summary>
public class ProvenanceItem
{
    /// <summary>
    /// Session identifier
    /// </summary>
    [JsonPropertyName("session_id")]
    public string? SessionId { get; set; }

    /// <summary>
    /// Source type (transcript, document, patient_details, etc.)
    /// </summary>
    [JsonPropertyName("source")]
    public string? Source { get; set; }

    /// <summary>
    /// Turn information for transcript sources
    /// </summary>
    [JsonPropertyName("turns")]
    public IList<TurnReference>? Turns { get; init; }

    /// <summary>
    /// Document section information
    /// </summary>
    [JsonPropertyName("document_sections")]
    public IList<DocumentSectionReference>? DocumentSections { get; init; }
}
