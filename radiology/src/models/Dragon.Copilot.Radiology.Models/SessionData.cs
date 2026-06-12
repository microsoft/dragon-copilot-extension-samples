using System;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models;

/// <summary>
/// Session context for request correlation and tracking.
/// </summary>
/// <remarks>
/// Corresponds to the SessionData schema defined in radiology-extensibility-api.yaml.
/// JSON property names on this type are snake_case (e.g. <c>correlation_id</c>) by design,
/// inherited from the upstream Dragon SessionData contract. The rest of the radiology
/// extensibility schemas use camelCase.
/// </remarks>
public class SessionData
{
    /// <summary>
    /// Gets or sets the unique session correlation identifier.
    /// </summary>
    [JsonPropertyName("correlation_id")]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// Gets or sets the session start timestamp. Optional; may be absent.
    /// </summary>
    [JsonPropertyName("session_start")]
    public DateTime? SessionStart { get; set; }

    /// <summary>
    /// Gets or sets the environment identifier.
    /// </summary>
    [JsonPropertyName("environment_id")]
    public string? EnvironmentId { get; set; }
}
