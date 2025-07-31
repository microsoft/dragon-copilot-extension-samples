// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Base interface for all resource types that can be included in DSP responses
/// </summary>
public interface IResource
{
    /// <summary>
    /// Unique identifier for the resource
    /// </summary>
    [JsonPropertyName("id")]
    string? Id { get; set; }
}
