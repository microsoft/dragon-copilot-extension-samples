// // Copyright (c) Microsoft Corporation.
// // Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Practitioner information
/// </summary>
public class Practitioner
{
    /// <summary>
    /// Full name of the practitioner
    /// </summary>
    [JsonPropertyName("full_name")]
    public string? FullName { get; set; }

    /// <summary>
    /// User identifier
    /// </summary>
    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }
}
