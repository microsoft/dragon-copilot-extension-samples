// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Clinical document section resource
/// </summary>
public class ClinicalDocumentSection : IResource
{
    /// <summary>
    /// Unique identifier for the resource
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>
    /// Legacy identifier
    /// </summary>
    [JsonPropertyName("legacy_id")]
    public string? LegacyId { get; set; }

    /// <summary>
    /// Context information
    /// </summary>
    [JsonPropertyName("context")]
    public Context? Context { get; set; }

    /// <summary>
    /// Content of the section
    /// </summary>
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
