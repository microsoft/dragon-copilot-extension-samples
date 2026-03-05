// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Represents the data of an Append to Note Section Action.
/// </summary>
public class AppendToNoteSectionActionData  : ActionData
{
    /// <summary>
    /// Content to be appended to the note section.
    /// </summary>
    [JsonPropertyName("dragonAppendContent")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DragonAppendContent { get; set; }
}
