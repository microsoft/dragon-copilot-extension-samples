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
    /// Schema version
    /// </summary>
    [JsonPropertyName("schema_version")]
    public string? SchemaVersion { get; set; }

    /// <summary>
    /// Document information
    /// </summary>
    [JsonPropertyName("document")]
    public Document? Document { get; set; }

    /// <summary>
    /// Clinical resources extracted or generated
    /// </summary>
    [JsonPropertyName("resources")]
    public ICollection<IResource> Resources { get; } = new List<IResource>();
}
