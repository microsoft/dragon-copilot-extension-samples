using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// A DICOM series the AI model read.
/// </summary>
/// <remarks>
/// Corresponds to the Series definition in pre-draft-report-schema.json.
/// </remarks>
public class Series
{
    /// <summary>
    /// Gets or sets the DICOM Series Instance UID.
    /// </summary>
    [JsonPropertyName("seriesUid")]
    public string? SeriesUid { get; set; }

    /// <summary>
    /// Gets or sets the DICOM SOP Instance UIDs used by the AI model.
    /// </summary>
    [JsonPropertyName("instanceUids")]
    [SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Collection<string>? InstanceUids { get; set; }
}
