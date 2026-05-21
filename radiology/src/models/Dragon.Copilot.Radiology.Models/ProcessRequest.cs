using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models;

/// <summary>
/// DCR Extensibility API request envelope that carries session metadata and a map of named
/// input payloads.
/// </summary>
public class ProcessRequest
{
    /// <summary>
    /// Contract version.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    [JsonPropertyName("schema_version")]
    public string SchemaVersion { get; set; } = null!;

    /// <summary>
    /// Session context for request correlation and tracking.
    /// </summary>
    [Required]
    [JsonPropertyName("sessionData")]
    public SessionData SessionData { get; set; } = null!;

    /// <summary>
    /// Patient demographics.
    /// </summary>
    [JsonPropertyName("patientInformation")]
    public PatientInformation? PatientInformation { get; set; }

    /// <summary>
    /// The radiology report to analyze.
    /// </summary>
    [JsonPropertyName("report")]
    public Report? Report { get; set; }
}
