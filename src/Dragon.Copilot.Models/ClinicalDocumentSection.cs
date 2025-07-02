// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Clinical document section
/// </summary>
public class ClinicalDocumentSection
{
    /// <summary>
    /// Legacy identifier
    /// </summary>
    [JsonPropertyName("legacy_id")]
    public string? LegacyId { get; set; }

    /// <summary>
    /// Content of the section
    /// </summary>
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
