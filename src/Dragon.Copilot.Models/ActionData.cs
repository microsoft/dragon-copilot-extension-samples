// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Models;

/// <summary>
/// Base class for all action data payloads (action data objects) used by Dragon Copilot actions.
/// </summary>
[JsonDerivedType(typeof(RejectActionData))]
[JsonDerivedType(typeof(CopyToClipboardActionData))]
[JsonDerivedType(typeof(AppendToNoteSectionActionData))]
[JsonDerivedType(typeof(MergeWithNoteActionData))]
[JsonDerivedType(typeof(RegenerateActionData))]
public class ActionData
{
    /// <summary>
    /// Name for this Dragon Extension Tool
    /// </summary>
    [JsonPropertyName("dragonExtensionToolName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DragonExtensionToolName { get; set; }

    /// <summary>
    /// Any key-value pair mapping that might be collected by the partner when this action is invoked.
    /// We do not want to display the name of this property and have a flattened structure so we are utilizing the JsonExtensionData attribute.
    /// </summary>
    [JsonExtensionData]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IDictionary<string, object?>? ActionMappings { get; init; }

}
