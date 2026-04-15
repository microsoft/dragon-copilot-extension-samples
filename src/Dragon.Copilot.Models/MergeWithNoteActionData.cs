// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Represents the data of a Merge with Note action.
/// </summary>
public class MergeWithNoteActionData : ActionData
{
    /// <summary>
    /// A list of all those input element ids which should be considered when merging content into the note. 
    /// </summary>
    [JsonPropertyName("dragonInputs")]
    public required IList<string> DragonInputs { get; init; }

    /// <summary>
    /// An optional string indicating what text to target during the merge. 
    /// </summary>
    [JsonPropertyName("dragonMatchContent")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DragonMatchContent { get; set; }
}
