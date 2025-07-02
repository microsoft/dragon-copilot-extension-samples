// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Dragon Service Provider (DSP) response structure
/// </summary>
public class DspResponse
{
    /// <summary>
    /// Payload version
    /// </summary>
    [JsonPropertyName("payload_version")]
    public string? PayloadVersion { get; set; }

    /// <summary>
    /// Schema version
    /// </summary>
    [JsonPropertyName("schema_version")]
    public string? SchemaVersion { get; set; }

    /// <summary>
    /// Priority level
    /// </summary>
    [JsonPropertyName("priority")]
    public string? Priority { get; set; }

    /// <summary>
    /// External callback URL
    /// </summary>
    [JsonPropertyName("external_callback_url")]
    public Uri? ExternalCallbackUrl { get; set; }

    /// <summary>
    /// Encounter information
    /// </summary>
    [JsonPropertyName("encounter")]
    public Encounter? Encounter { get; set; }

    /// <summary>
    /// Document information
    /// </summary>
    [JsonPropertyName("document")]
    public Document? Document { get; set; }

    /// <summary>
    /// Clinical resources extracted or generated
    /// </summary>
    [JsonPropertyName("resources")]
    public ICollection<object>? Resources { get; } = new List<object>();
}
