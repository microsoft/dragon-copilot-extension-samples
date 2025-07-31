// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Encounter information
/// </summary>
public class Encounter
{
    /// <summary>
    /// Correlation identifier
    /// </summary>
    [JsonPropertyName("correlation_id")]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// External encounter identifier (deprecated - use external_encounter_ids instead)
    /// </summary>
    [JsonPropertyName("external_encounter_id")]
    [Obsolete("Use ExternalEncounterIds instead. This will be removed in future versions.")]
    public string? ExternalEncounterId { get; set; }

    /// <summary>
    /// External encounter identifiers (replaces single external_encounter_id)
    /// </summary>
    [JsonPropertyName("external_encounter_ids")]
    public IList<ExternalIdentifier>? ExternalEncounterIds { get; init; }

    /// <summary>
    /// Status of the encounter
    /// </summary>
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>
    /// Date of the encounter
    /// </summary>
    [JsonPropertyName("date_of_encounter")]
    public DateTime? DateOfEncounter { get; set; }

    /// <summary>
    /// Service date for the encounter
    /// </summary>
    [JsonPropertyName("service_date")]
    public DateTime? ServiceDate { get; set; }

    /// <summary>
    /// Patient information
    /// </summary>
    [JsonPropertyName("patient")]
    public Patient? Patient { get; set; }

    /// <summary>
    /// Practitioner information
    /// </summary>
    [JsonPropertyName("practitioner")]
    public Practitioner? Practitioner { get; set; }

    /// <summary>
    /// Visit information
    /// </summary>
    [JsonPropertyName("visit")]
    public Visit? Visit { get; set; }

    /// <summary>
    /// Organization identifier
    /// </summary>
    [JsonPropertyName("organization_id")]
    public string? OrganizationId { get; set; }

    /// <summary>
    /// User identifier
    /// </summary>
    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }

    /// <summary>
    /// Recording locales
    /// </summary>
    [JsonPropertyName("recording_locales")]
    public IList<string>? RecordingLocales { get; init; }

    /// <summary>
    /// Report locale
    /// </summary>
    [JsonPropertyName("report_locale")]
    public string? ReportLocale { get; set; }

    /// <summary>
    /// UI locale
    /// </summary>
    [JsonPropertyName("ui_locale")]
    public string? UiLocale { get; set; }
}
