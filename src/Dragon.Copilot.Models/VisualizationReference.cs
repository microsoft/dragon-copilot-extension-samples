// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Card reference to related data sources
/// </summary>
public class VisualizationReference
{
    /// <summary>
    /// Unique identifier for the reference (required)
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Type of reference (required)
    /// </summary>
    [JsonPropertyName("type")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public required ReferenceType Type { get; set; }

    /// <summary>
    /// Section identifier for Note type references
    /// </summary>
    [JsonPropertyName("sectionId")]
    public string? SectionId { get; set; }

    /// <summary>
    /// Reference text content for Transcript type references
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>
    /// Title for Web type references
    /// </summary>
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    /// <summary>
    /// URL for Web type references
    /// </summary>
    [JsonPropertyName("url")]
    public Uri? Url { get; set; }
}
