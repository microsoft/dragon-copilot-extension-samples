// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Action button styles
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ActionButtonType
{
    /// <summary>
    /// Accept action button
    /// </summary>
    Accept,

    /// <summary>
    /// Copy action button
    /// </summary>
    Copy,

    /// <summary>
    /// Reject action button
    /// </summary>
    Reject,

    /// <summary>
    /// Update note action button
    /// </summary>
    UpdateNote
}
