using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models;

/// <summary>
/// Request envelope for the /v1/process endpoint.
/// </summary>
/// <remarks>
/// Corresponds to the ProcessRequest schema defined in radiology-extensibility-api.yaml.
/// The envelope allows additional named inputs beyond <see cref="PatientInformation"/> and
/// <see cref="Report"/> — they are surfaced via <see cref="AdditionalProperties"/>.
/// </remarks>
/// <example>
/// <code>
/// var request = new ProcessRequest
/// {
///     ExtensibilityApiVersion = "1.1.1",
///     SessionData = new SessionData { CorrelationId = "..." },
///     PatientInformation = new PatientInformation { DateOfBirth = new DateOnly(1990, 1, 15) },
///     Report = new Report { ReportText = "..." },
/// };
/// </code>
/// </example>
public class ProcessRequest
{
    /// <summary>
    /// Gets or sets the transport version emitted by Dragon Copilot (e.g., "1.1.1").
    /// </summary>
    [JsonPropertyName("extensibilityApiVersion")]
    public string? ExtensibilityApiVersion { get; set; }

    /// <summary>
    /// Gets or sets the session context for request correlation and tracking.
    /// </summary>
    [Required]
    [JsonPropertyName("sessionData")]
    public SessionData SessionData { get; set; } = null!;

    /// <summary>
    /// Gets or sets the patient demographic information, if present.
    /// </summary>
    [JsonPropertyName("patientInformation")]
    public PatientInformation? PatientInformation { get; set; }

    /// <summary>
    /// Gets or sets the radiology report, if present.
    /// </summary>
    [JsonPropertyName("report")]
    public Report? Report { get; set; }

    /// <summary>
    /// Gets or sets any additional named inputs not covered by the explicit properties above.
    /// Corresponds to the schema's <c>additionalProperties: true</c> allowance.
    /// </summary>
    [JsonExtensionData]
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Dictionary<string, JsonElement>? AdditionalProperties { get; set; }
}
