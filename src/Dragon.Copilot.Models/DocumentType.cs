// // Copyright (c) Microsoft Corporation.
// // Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Document type information
/// </summary>
public class DocumentType
{
    /// <summary>
    /// Type text
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}
