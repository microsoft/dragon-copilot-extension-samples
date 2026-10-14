// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.ComponentModel;
using System.Text.Json.Nodes;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using SampleConversational.Mcp.Web.Services;

namespace SampleConversational.Mcp.Web.Tools;

/// <summary>
/// MCP tools exposed by this server. Dragon Copilot discovers them via <c>tools/list</c> and the
/// assistant picks one based on its name, description and parameter descriptions.
/// </summary>
[McpServerToolType]
public sealed class ClinicalTools
{
    /// <summary>
    /// Returns a synthetic reference range for a lab test.
    /// </summary>
    [McpServerTool(Name = "lookup_reference_range", ReadOnly = true, UseStructuredContent = true, Title = "Lookup reference range")]
    [Description("Returns the typical adult reference range for a lab test (for example HbA1c, potassium, sodium, TSH).")]
    public static ReferenceRange LookupReferenceRange(
        [Description("Lab test name, for example 'HbA1c'.")] string test)
    {
        return ClinicalReference.LookupReferenceRange(test)
            ?? new ReferenceRange(test, "unknown", string.Empty, $"No reference range is available for '{test}'.");
    }

    /// <summary>
    /// Extracts orders from the encounter transcript.
    /// </summary>
    /// <remarks>
    /// In the manifest, <c>runtimeParamBindings</c> injects the transcript into the <c>transcript</c>
    /// argument (target: argument) and the conversation ID into <c>_meta.dragon.conversationId</c>
    /// (target: sideChannel). The Dragon Copilot assistant's model never sees or retypes either value.
    /// </remarks>
    [McpServerTool(Name = "extract_orders", ReadOnly = true, UseStructuredContent = true, Title = "Extract orders")]
    [Description("Extracts lab, imaging, medication and referral orders mentioned in the current encounter transcript.")]
    public static OrderExtractionResult ExtractOrders(
        RequestContext<CallToolRequestParams> context,
        [Description("Encounter transcript. Supplied by the platform.")] string transcript)
    {
        ArgumentNullException.ThrowIfNull(context);
        return ClinicalReference.ExtractOrders(transcript, ReadConversationId(context.Params?.Meta));
    }

    internal static string? ReadConversationId(JsonObject? meta) =>
        meta?["dragon"]?["conversationId"]?.GetValueKind() == System.Text.Json.JsonValueKind.String
            ? meta["dragon"]!["conversationId"]!.GetValue<string>()
            : null;
}
