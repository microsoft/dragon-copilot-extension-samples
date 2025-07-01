// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Patient information
/// </summary>
public class Patient
{
    /// <summary>
    /// Patient name details
    /// </summary>
    [JsonPropertyName("name_details")]
    public NameDetails? NameDetails { get; set; }

    /// <summary>
    /// Patient gender
    /// </summary>
    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    /// <summary>
    /// Medical record number
    /// </summary>
    [JsonPropertyName("medical_record_number")]
    public string? MedicalRecordNumber { get; set; }

    /// <summary>
    /// External patient identifier
    /// </summary>
    [JsonPropertyName("external_patient_id")]
    public string? ExternalPatientId { get; set; }
}
