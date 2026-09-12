using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// A structured report made up of named sections.
/// </summary>
/// <remarks>
/// Corresponds to the StructuredReport definition in pre-draft-report-schema.json.
/// </remarks>
public class StructuredReport
{
    /// <summary>
    /// Gets or sets how section content is encoded: <c>plain_text</c> or <c>markdown</c>.
    /// </summary>
    [JsonPropertyName("format")]
    public string Format { get; set; } = null!;

    /// <summary>
    /// Gets or sets the report sections.
    /// </summary>
    [JsonPropertyName("sections")]
    [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Collection<Section> Sections { get; set; } = new Collection<Section>();
}
