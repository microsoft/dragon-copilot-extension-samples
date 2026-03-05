// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Available card action types
/// </summary>
[JsonConverter(typeof(CamelCaseEnumConverter))]
public enum VisualizationActionVerb
{

    /// <summary>
    /// Reject actionx
    /// </summary>
    Reject,

    /// <summary>
    /// CopyToClipboard action
    /// </summary>
    CopyToClipboard,

    /// <summary>
    /// AppendToNoteSection actionx
    /// </summary>
    AppendToNoteSection,

    /// <summary>
    /// MergeWithNote action
    /// </summary>
    MergeWithNote,

    /// <summary>
    /// Regenerate actionx
    /// </summary>
    Regenerate
}
