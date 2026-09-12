using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// The imaging study a pre-draft report was generated from.
/// </summary>
/// <remarks>
/// Corresponds to the ImagingStudy definition in pre-draft-report-schema.json.
/// </remarks>
public class ImagingStudy
{
    /// <summary>
    /// Gets or sets the DICOM Study Instance UID.
    /// </summary>
    [JsonPropertyName("studyUid")]
    public string StudyUid { get; set; } = null!;

    /// <summary>
    /// Gets or sets the series the AI model read.
    /// </summary>
    [JsonPropertyName("series")]
    [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Collection<Series>? Series { get; set; }

    /// <summary>
    /// Gets or sets the accession number of the study.
    /// </summary>
    /// <remarks>
    /// This is what the result is matched to an order by, so it must match exactly one order in the
    /// environment: no match is rejected with 404 Not Found and more than one with 409 Conflict.
    /// Contains PHI.
    /// </remarks>
    [JsonPropertyName("accessionNumber")]
    public string AccessionNumber { get; set; } = null!;

    /// <summary>
    /// Gets or sets the patient medical record number. Contains PHI.
    /// </summary>
    [JsonPropertyName("patientMrn")]
    public string? PatientMrn { get; set; }

    /// <summary>
    /// Gets or sets the DICOM modality code (Tag 0008,0060).
    /// </summary>
    [JsonPropertyName("modality")]
    public string? Modality { get; set; }

    /// <summary>
    /// Gets or sets the body parts examined.
    /// </summary>
    [JsonPropertyName("bodyParts")]
    [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Collection<string>? BodyParts { get; set; }

    /// <summary>
    /// Gets or sets the CPT/HCPCS code for the procedure performed.
    /// </summary>
    [JsonPropertyName("procedureCode")]
    public string? ProcedureCode { get; set; }

    /// <summary>
    /// Gets or sets the study date and time as an ISO 8601 UTC timestamp.
    /// </summary>
    [JsonPropertyName("studyDateTime")]
    public string? StudyDateTime { get; set; }
}
