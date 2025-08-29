// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Card action definition
/// </summary>
public class VisualizationAction
{
    /// <summary>
    /// Display title for the action (required)
    /// </summary>
    [JsonPropertyName("title")]
    public required string Title { get; set; }

    /// <summary>
    /// Action identifier (required)
    /// </summary>
    [JsonPropertyName("action")]
    public required VisualizationActionType Action { get; set; }

    /// <summary>
    /// Action button style (required)
    /// </summary>
    [JsonPropertyName("actionType")]
    public required ActionButtonType ActionType { get; set; }

    /// <summary>
    /// Optional code content for copy actions
    /// </summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }
}
