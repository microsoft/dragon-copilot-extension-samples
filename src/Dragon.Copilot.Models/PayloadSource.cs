using System;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Payload source information
/// </summary>
public class PayloadSource
{
    /// <summary>
    /// Unique identifier for the source (required)
    /// </summary>
    [JsonPropertyName("identifier")]
    public required string Identifier { get; set; }

    /// <summary>
    /// Description of the source (required)
    /// </summary>
    [JsonPropertyName("description")]
    public required string Description { get; set; }

    /// <summary>
    /// URL pointing to the source (required)
    /// </summary>
    [JsonPropertyName("url")]
    public required Uri Url { get; set; }
}
