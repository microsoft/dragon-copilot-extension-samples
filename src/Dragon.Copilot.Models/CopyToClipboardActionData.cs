// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Represents the data of a Copy to Clipboard Action.
/// </summary>
public class CopyToClipboardActionData : ActionData
{
    /// <summary>
    /// The content, if any, to be copied to the clipboard.
    /// </summary>
    [JsonPropertyName("dragonClipboardContent")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DragonClipboardContent { get; set; }
}
