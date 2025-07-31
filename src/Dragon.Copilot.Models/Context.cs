using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Context information for resources
/// </summary>
public class Context
{
    /// <summary>
    /// Context identifier
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>
    /// Content type
    /// </summary>
    [JsonPropertyName("content_type")]
    public string? ContentType { get; set; }

    /// <summary>
    /// Display description
    /// </summary>
    [JsonPropertyName("display_description")]
    public string? DisplayDescription { get; set; }

    /// <summary>
    /// Definition describing purpose or functionality
    /// </summary>
    [JsonPropertyName("definition")]
    public string? Definition { get; set; }

    /// <summary>
    /// Associated codes
    /// </summary>
    [JsonPropertyName("codes")]
    public IList<CodeInfo>? Codes { get; init; }

    /// <summary>
    /// Spoken forms
    /// </summary>
    [JsonPropertyName("spoken_forms")]
    public IList<string>? SpokenForms { get; init; }
}
