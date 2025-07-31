using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Document section reference
/// </summary>
public class DocumentSectionReference
{
    /// <summary>
    /// Section identifier
    /// </summary>
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    /// <summary>
    /// Character positions (start, end)
    /// </summary>
    [JsonPropertyName("positions")]
    public IList<int>? Positions { get; init; }
}
