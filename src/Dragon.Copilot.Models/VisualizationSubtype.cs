// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Visualization resource subtypes
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VisualizationSubtype
{
    /// <summary>
    /// Note subtype
    /// </summary>
    Note,

    /// <summary>
    /// Timeline subtype
    /// </summary>
    Timeline
}
