// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Response model for processed data according to OpenAPI specification
/// </summary>
public class ProcessResponse
{
    /// <summary>
    /// Indicates if the processing was successful
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Processing result message
    /// </summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>
    /// The processed payload data containing DSP responses
    /// </summary>
    [JsonPropertyName("payload")]
    public IDictionary<string, DspResponse>? Payload { get; } = new Dictionary<string, DspResponse>();
}
