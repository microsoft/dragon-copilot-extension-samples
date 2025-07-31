using System;
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Standardized code information structure
/// </summary>
public class CodeInfo
{
    /// <summary>
    /// The code identifier (required)
    /// </summary>
    [JsonPropertyName("identifier")]
    public required string Identifier { get; set; }

    /// <summary>
    /// Human-readable description of the code
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// The coding system
    /// </summary>
    [JsonPropertyName("system")]
    public string? System { get; set; }

    /// <summary>
    /// URL resource for system details
    /// </summary>
    [JsonPropertyName("system_url")]
    public Uri? SystemUrl { get; set; }

    /// <summary>
    /// Version of the coding system
    /// </summary>
    [JsonPropertyName("system_version")]
    public string? SystemVersion { get; set; }
}
