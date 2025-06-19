// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Text.Json.Serialization;

namespace DragonBackendSimulator.Web.Models;

public sealed class ExtensionResponse
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter<EncounterStatus>))]
    public EncounterStatus Status { get; set; }

    public int? StatusCode { get; set; }

    public string? ExternalApiResponse { get; set; }

    public string? ErrorMessage { get; set; }
}
