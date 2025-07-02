// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Dragon session information
/// </summary>
public class DragonSession
{
    /// <summary>
    /// DAX session identifier
    /// </summary>
    [JsonPropertyName("dax_session_id")]
    public string? DaxSessionId { get; set; }

    /// <summary>
    /// User identifier
    /// </summary>
    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }

    /// <summary>
    /// Organization identifier
    /// </summary>
    [JsonPropertyName("organization_id")]
    public string? OrganizationId { get; set; }
}
