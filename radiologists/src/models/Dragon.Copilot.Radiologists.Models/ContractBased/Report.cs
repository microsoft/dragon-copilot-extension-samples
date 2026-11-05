using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// Radiology report text payload.
/// </summary>
/// <remarks>
/// Corresponds to the Report schema defined in radiologists-extensibility-api.yaml.
/// </remarks>
/// <example>
/// <code>
/// var report = new Report
/// {
///     ReportText = "No acute cardiopulmonary abnormality.",
/// };
/// </code>
/// </example>
public class Report
{
    /// <summary>
    /// Gets or sets the radiology report text.
    /// </summary>
    [Required]
    [JsonPropertyName("reportText")]
    public string ReportText { get; set; } = null!;
}
