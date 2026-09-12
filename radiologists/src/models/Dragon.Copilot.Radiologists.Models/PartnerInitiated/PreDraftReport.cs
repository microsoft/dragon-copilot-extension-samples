using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// An AI-generated pre-draft radiology report.
/// </summary>
/// <remarks>
/// Corresponds to the PreDraftReport schema in pre-draft-report-schema.json, at
/// <c>x-ms-schema-version</c> 1.0. Referenced from a manifest as
/// <c>application/vnd.ms-dragon.rad.pre-draft-report+json</c>, and carried as the
/// <c>draftReport</c> member of a <see cref="PreDraftReportIngestRequest"/>.
/// </remarks>
public class PreDraftReport
{
    /// <summary>
    /// Gets or sets the partner-generated identifier for this result.
    /// </summary>
    /// <remarks>
    /// Must be unique per run. Resubmitting a stored identifier is rejected with 409 Conflict, so
    /// retrying a run cannot create a second stored result.
    /// </remarks>
    [JsonPropertyName("identifier")]
    public string Identifier { get; set; } = null!;

    /// <summary>
    /// Gets or sets the report category (for example <c>RAD</c>).
    /// </summary>
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the LOINC code for the report.
    /// </summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    /// <summary>
    /// Gets or sets the AI system that generated this draft report.
    /// </summary>
    [JsonPropertyName("aiSystemInfo")]
    public AISystemInfo AISystemInfo { get; set; } = null!;

    /// <summary>
    /// Gets or sets the imaging study the draft report was generated from.
    /// </summary>
    [JsonPropertyName("imagingStudy")]
    public ImagingStudy ImagingStudy { get; set; } = null!;

    /// <summary>
    /// Gets or sets the prior studies used to generate the draft report.
    /// </summary>
    [JsonPropertyName("imagingStudyPriors")]
    [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Collection<ImagingStudyPrior>? ImagingStudyPriors { get; set; }

    /// <summary>
    /// Gets or sets the report body.
    /// </summary>
    [JsonPropertyName("reportContent")]
    public ReportContent ReportContent { get; set; } = null!;

    /// <summary>
    /// Gets or sets the quality scores for the generated report.
    /// </summary>
    [JsonPropertyName("qualityMetrics")]
    public QualityMetrics? QualityMetrics { get; set; }
}
