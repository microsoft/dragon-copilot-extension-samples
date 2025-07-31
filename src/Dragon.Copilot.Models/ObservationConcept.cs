// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Observation concept resource
/// </summary>
public class ObservationConcept : IResource
{
    /// <summary>
    /// Unique identifier for the resource
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>
    /// Context information (required)
    /// </summary>
    [JsonPropertyName("context")]
    public required Context Context { get; set; }

    /// <summary>
    /// Observation value
    /// </summary>
    [JsonPropertyName("value")]
    public ObservationValue? Value { get; set; }

    /// <summary>
    /// Priority level
    /// </summary>
    [JsonPropertyName("priority")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public Priority? Priority { get; set; }

    /// <summary>
    /// Parent reference UUID
    /// </summary>
    [JsonPropertyName("parent_reference")]
    public string? ParentReference { get; set; }

    /// <summary>
    /// Provenance information
    /// </summary>
    [JsonPropertyName("provenance")]
    public IList<ProvenanceItem>? Provenance { get; init; }
}
