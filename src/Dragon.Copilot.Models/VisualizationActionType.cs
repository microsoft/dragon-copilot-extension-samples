using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Available card action types
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VisualizationActionType
{
    /// <summary>
    /// Accept action
    /// </summary>
    Accept,

    /// <summary>
    /// Reject action
    /// </summary>
    Reject,

    /// <summary>
    /// Copy action
    /// </summary>
    Copy,

    /// <summary>
    /// Update note action
    /// </summary>
    UpdateNote
}
