// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Physician.Models;

/// <summary>
/// Adaptive card payload structure
/// </summary>
/// <remarks>
/// Validate generated cards against what Dragon Copilot accepts using the
/// Adaptive Card Validator: https://cardvalidator.copilot.dragon.com/
/// (also reachable via https://aka.ms/adaptiveCardValidator).
/// Reference: https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/extensions/adaptive-card-spec.
/// </remarks>
public class AdaptiveCardPayload
{
    /// <summary>
    /// Adaptive card schema URL
    /// </summary>
    [JsonPropertyName("$schema")]
    public string Schema {get; } = "http://adaptivecards.io/schemas/adaptive-card.json";

    /// <summary>
    /// Type of the card (always "AdaptiveCard")
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "AdaptiveCard";

    /// <summary>
    /// Adaptive card version. Optional - omit (leave null) to let Dragon Copilot
    /// apply its default supported version. Set explicitly only if you require a
    /// specific Adaptive Cards schema version.
    /// </summary>
    [JsonPropertyName("version")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Version { get; init; }

    /// <summary>
    /// Body elements of the adaptive card
    /// </summary>
    [JsonPropertyName("body")]
    public IList<object> Body { get; init; } = new List<object>();

    /// <summary>
    /// Available actions for the card
    /// </summary>
    [JsonPropertyName("actions")]
    public IList<VisualizationAction>? Actions { get; init; }
}