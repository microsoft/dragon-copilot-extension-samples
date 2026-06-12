using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models;

/// <summary>
/// Response envelope for the /v1/process endpoint.
/// </summary>
/// <remarks>
/// Corresponds to the ProcessResponse schema defined in radiology-extensibility-api.yaml.
/// The <see cref="Payload"/> is a map of named outputs (e.g., "qualityCheckResult"), each value
/// being a <see cref="QualityCheckResult"/>. Output names are declared in the extension's manifest.
/// </remarks>
/// <example>
/// <code>
/// var response = new ProcessResponse
/// {
///     Success = true,
///     Message = "Quality check completed successfully.",
///     Payload = new Dictionary&lt;string, QualityCheckResult&gt;
///     {
///         ["qualityCheckResult"] = new QualityCheckResult { Recommendations = ... },
///     },
/// };
/// </code>
/// </example>
public class ProcessResponse
{
    /// <summary>
    /// Gets or sets a value indicating whether the extension completed processing successfully.
    /// </summary>
    [JsonPropertyName("success")]
    public bool? Success { get; set; }

    /// <summary>
    /// Gets or sets the human-readable status message.
    /// </summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>
    /// Gets or sets the map of named outputs, keyed by output name from the extension manifest.
    /// </summary>
    [JsonPropertyName("payload")]
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
    public Dictionary<string, QualityCheckResult>? Payload { get; set; }
}
