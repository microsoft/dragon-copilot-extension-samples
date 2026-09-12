using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// Quality scores for a generated pre-draft report.
/// </summary>
/// <remarks>
/// Corresponds to the QualityMetrics definition in pre-draft-report-schema.json. The object as a
/// whole is optional, but <see cref="ImageQualityScore"/> is required when it is present.
/// </remarks>
public class QualityMetrics
{
    /// <summary>
    /// Gets or sets the overall confidence for the whole report, between 0 and 1.
    /// </summary>
    [JsonPropertyName("overallConfidenceScore")]
    public double? OverallConfidenceScore { get; set; }

    /// <summary>
    /// Gets or sets the quality of the input images, between 0 and 1.
    /// </summary>
    [JsonPropertyName("imageQualityScore")]
    public double ImageQualityScore { get; set; }

    /// <summary>
    /// Gets or sets the diagnostic certainty of the findings, between 0 and 1.
    /// </summary>
    [JsonPropertyName("diagnosticCertaintyScore")]
    public double? DiagnosticCertaintyScore { get; set; }
}
