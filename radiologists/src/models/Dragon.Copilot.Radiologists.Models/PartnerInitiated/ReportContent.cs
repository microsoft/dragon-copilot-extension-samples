using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// The body of a pre-draft report.
/// </summary>
/// <remarks>
/// Corresponds to the ReportContent definition in pre-draft-report-schema.json.
/// </remarks>
public class ReportContent
{
    /// <summary>
    /// Gets or sets the content format. Only <c>structured_report</c> is accepted today.
    /// </summary>
    [JsonPropertyName("format")]
    public string Format { get; set; } = null!;

    /// <summary>
    /// Gets or sets the structured report body.
    /// </summary>
    [JsonPropertyName("structuredReport")]
    public StructuredReport StructuredReport { get; set; } = null!;
}
