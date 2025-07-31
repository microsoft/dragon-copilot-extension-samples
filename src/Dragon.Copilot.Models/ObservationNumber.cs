// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Numeric observation resource
/// </summary>
public class ObservationNumber : IResource
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
    /// Numeric value (required)
    /// </summary>
    [JsonPropertyName("value")]
    public required double Value { get; set; }

    /// <summary>
    /// Unit for the value
    /// </summary>
    [JsonPropertyName("value_unit")]
    public string? ValueUnit { get; set; }

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
