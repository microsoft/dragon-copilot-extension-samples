// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Visualization resource for adaptive cards
/// </summary>
public class VisualizationResource : IResource
{
    /// <summary>
    /// Unique identifier for the resource (required)
    /// </summary>
    [JsonPropertyName("id")]
    public required string? Id { get; set; }

    /// <summary>
    /// Type of the resource (required, always "AdaptiveCard")
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "AdaptiveCard";

    /// <summary>
    /// Subtype of the adaptive card
    /// </summary>
    [JsonPropertyName("subtype")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public VisualizationSubtype? Subtype { get; set; }

    /// <summary>
    /// Display title for the adaptive card
    /// </summary>
    [JsonPropertyName("cardTitle")]
    public string? CardTitle { get; set; }

    /// <summary>
    /// Partner logo URL
    /// </summary>
    [JsonPropertyName("partnerLogo")]
    public string? PartnerLogo { get; set; }

    /// <summary>
    /// Adaptive card payload (required)
    /// </summary>
    [JsonPropertyName("adaptive_card_payload")]
    public required object AdaptiveCardPayload { get; set; }

    /// <summary>
    /// Available actions for the card
    /// </summary>
    [JsonPropertyName("actions")]
    public IList<VisualizationAction>? Actions { get; init; }

    /// <summary>
    /// References to related data sources
    /// </summary>
    [JsonPropertyName("references")]
    public IList<VisualizationReference>? References { get; init; }

    /// <summary>
    /// Payload sources information (required)
    /// </summary>
    [JsonPropertyName("payloadSources")]
    public required IList<PayloadSource> PayloadSources { get; init; }

    /// <summary>
    /// Dragon Copilot copy data (required)
    /// </summary>
    [JsonPropertyName("dragonCopilotCopyData")]
    public required string DragonCopilotCopyData { get; set; }
}
