// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Medical code resource
/// </summary>
public class MedicalCode : IResource
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
    /// Code details (required)
    /// </summary>
    [JsonPropertyName("code")]
    public required CodeInfo Code { get; set; }

    /// <summary>
    /// Details about why the code was applied
    /// </summary>
    [JsonPropertyName("details")]
    public string? Details { get; set; }

    /// <summary>
    /// Source information
    /// </summary>
    [JsonPropertyName("source")]
    public SourceInfo? Source { get; set; }

    /// <summary>
    /// Priority level
    /// </summary>
    [JsonPropertyName("priority")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public Priority? Priority { get; set; }

    /// <summary>
    /// Reason for the code recommendation
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    /// <summary>
    /// Provenance information
    /// </summary>
    [JsonPropertyName("provenance")]
    public IList<ProvenanceItem>? Provenance { get; init; }
}
