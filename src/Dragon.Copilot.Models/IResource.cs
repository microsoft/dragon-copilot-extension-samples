// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Base interface for all resource types that can be included in DSP responses
/// </summary>
[JsonDerivedType(typeof(ClinicalDocumentSection))]
[JsonDerivedType(typeof(MedicalCode))]
[JsonDerivedType(typeof(ObservationConcept))]
[JsonDerivedType(typeof(ObservationNumber))]
[JsonDerivedType(typeof(VisualizationResource))]
public interface IResource
{
    /// <summary>
    /// Unique identifier for the resource
    /// </summary>
    [JsonPropertyName("id")]
    string? Id { get; set; }
}
