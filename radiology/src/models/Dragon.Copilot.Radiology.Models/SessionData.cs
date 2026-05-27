using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models;

/// <summary>
/// Session / correlation information forwarded by the host application.
/// </summary>
public class SessionData
{
    /// <summary>
    /// Correlation identifier used to trace the request across services.
    /// </summary>
    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// ISO-8601 timestamp of when the session started (optional).
    /// </summary>
    [JsonPropertyName("sessionStart")]
    public string? SessionStart { get; set; }

    /// <summary>
    /// Identifier of the environment the request originated from.
    /// </summary>
    [JsonPropertyName("environmentId")]
    public string? EnvironmentId { get; set; }
}
