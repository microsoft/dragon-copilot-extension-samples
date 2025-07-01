// // Copyright (c) Microsoft Corporation.
// // Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Visit information
/// </summary>
public class Visit
{
    /// <summary>
    /// Reason for the visit
    /// </summary>
    [JsonPropertyName("reason_for_visit")]
    public string? ReasonForVisit { get; set; }
}
