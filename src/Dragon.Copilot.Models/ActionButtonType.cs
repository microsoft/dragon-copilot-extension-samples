using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Action button styles
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ActionButtonType
{
    /// <summary>
    /// Primary action button style
    /// </summary>
    Primary,

    /// <summary>
    /// Secondary action button style
    /// </summary>
    Secondary,

    /// <summary>
    /// Tertiary action button style
    /// </summary>
    Tertiary
}
