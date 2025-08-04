// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Observation value details
/// </summary>
public class ObservationValue
{
    /// <summary>
    /// Text value
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>
    /// Associated codes
    /// </summary>
    [JsonPropertyName("codes")]
    public IList<CodeInfo>? Codes { get; init; }

    /// <summary>
    /// Dragon-defined concept identifier
    /// </summary>
    [JsonPropertyName("concept_id")]
    public string? ConceptId { get; set; }
}
