// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Document information
/// </summary>
public class Document
{
    /// <summary>
    /// Document title
    /// </summary>
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    /// <summary>
    /// Document type
    /// </summary>
    [JsonPropertyName("type")]
    public DocumentType? Type { get; set; }
}
