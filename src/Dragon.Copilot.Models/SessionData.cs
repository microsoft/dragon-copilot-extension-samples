// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Session data containing correlation and tenant information
/// </summary>
public class SessionData
{
    /// <summary>
    /// Correlation identifier for tracking
    /// </summary>
    [JsonPropertyName("correlation_id")]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// Session start timestamp
    /// </summary>
    [JsonPropertyName("session_start")]
    public DateTime? SessionStart { get; set; }

    /// <summary>
    /// Tenant identifier
    /// </summary>
    [JsonPropertyName("tenant_id")]
    public string? TenantId { get; set; }
}
