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
    /// Display type for the action (required)
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "Action.Execute";

    /// <summary>
    /// Id for an action (required)
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Display title for the action (required)
    /// </summary>
    [JsonPropertyName("title")]
    public required string Title { get; set; }

    /// <summary>
    /// Action Verb (required)
    /// </summary>
    [JsonPropertyName("verb")]
    public required VisualizationActionVerb Verb { get; set; }

    /// <summary>
    /// Optional data to send back to the partner when the action is invoked
    /// </summary>
    [JsonPropertyName("data")]
    public ActionData? Data { get; set; }
}
