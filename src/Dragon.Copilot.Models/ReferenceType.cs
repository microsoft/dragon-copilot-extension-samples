// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Reference types
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ReferenceType
{
    /// <summary>
    /// Reference to a note
    /// </summary>
    Note,

    /// <summary>
    /// Reference to a transcript
    /// </summary>
    Transcript,

    /// <summary>
    /// Reference to a web resource
    /// </summary>
    Web
}
