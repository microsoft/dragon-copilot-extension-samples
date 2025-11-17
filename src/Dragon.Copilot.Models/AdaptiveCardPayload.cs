// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Adaptive card payload structure
/// </summary>
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
    public string Type { get; } = "AdaptiveCard";

    /// <summary>
    /// Adaptive card version
    /// </summary>
    [JsonPropertyName("version")]
    public string Version { get; init; } = "1.3";

    /// <summary>
    /// Body elements of the adaptive card
    /// </summary>
    [JsonPropertyName("body")]
    public IList<object> Body { get; init; } = new List<object>();
}