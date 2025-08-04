// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
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

    /// <summary>
    /// National Provider Identifier (NPI) of the practitioner
    /// </summary>
    [JsonPropertyName("npi")]
    public int? Npi { get; set; }

    /// <summary>
    /// External practitioner identifiers
    /// </summary>
    [JsonPropertyName("external_practitioner_ids")]
    public IList<ExternalIdentifier>? ExternalPractitionerIds { get; init; }
}
