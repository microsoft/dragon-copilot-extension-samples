using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models;

/// <summary>
/// Envelope returned by <c>POST /v1/process</c>.
/// </summary>
public class ProcessResponse
{
    /// <summary>
    /// Contract version.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    [JsonPropertyName("schemaVersion")]
    public string SchemaVersion { get; set; } = null!;

    /// <summary>
    /// Indicates if the processing was successful
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Processing result message
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// The processed payload data containing DSP responses
    /// </summary>
    [JsonPropertyName("payload")]
    public IDictionary<string, QualityCheckResult> Payload { get; } = new Dictionary<string, QualityCheckResult>();
}
