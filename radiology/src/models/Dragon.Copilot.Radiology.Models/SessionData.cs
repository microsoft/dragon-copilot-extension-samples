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
    [JsonPropertyName("correlation_id")]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// ISO-8601 timestamp of when the session started (optional).
    /// </summary>
    [JsonPropertyName("session_start")]
    public string? SessionStart { get; set; }

    /// <summary>
    /// Identifier of the environment the request originated from.
    /// </summary>
    [JsonPropertyName("environment_id")]
    public string? EnvironmentId { get; set; }
}
