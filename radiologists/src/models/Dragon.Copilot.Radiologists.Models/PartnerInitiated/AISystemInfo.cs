using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// The AI system that generated a pre-draft report.
/// </summary>
/// <remarks>
/// Corresponds to the AISystemInfo definition in pre-draft-report-schema.json.
/// </remarks>
public class AISystemInfo
{
    /// <summary>
    /// Gets or sets the partner's AI system version, as semantic major.minor.patch.
    /// </summary>
    [JsonPropertyName("version")]
    public string Version { get; set; } = null!;
}
