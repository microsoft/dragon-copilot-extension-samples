// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Turn reference information
/// </summary>
public class TurnReference
{
    /// <summary>
    /// Turn index
    /// </summary>
    [JsonPropertyName("index")]
    public int Index { get; set; }

    /// <summary>
    /// Character positions (start, end)
    /// </summary>
    [JsonPropertyName("positions")]
    public IList<int>? Positions { get; init; }
}
