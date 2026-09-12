using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// A prior study used to generate the draft report.
/// </summary>
/// <remarks>
/// Corresponds to the ImagingStudyPrior definition in pre-draft-report-schema.json.
/// </remarks>
public class ImagingStudyPrior
{
    /// <summary>
    /// Gets or sets the DICOM Study Instance UID of the prior study.
    /// </summary>
    [JsonPropertyName("studyUid")]
    public string StudyUid { get; set; } = null!;

    /// <summary>
    /// Gets or sets the prior study date and time as an ISO 8601 UTC timestamp.
    /// </summary>
    [JsonPropertyName("studyDateTime")]
    public string? StudyDateTime { get; set; }

    /// <summary>
    /// Gets or sets the DICOM modality code for the prior study.
    /// </summary>
    [JsonPropertyName("modality")]
    public string? Modality { get; set; }
}
