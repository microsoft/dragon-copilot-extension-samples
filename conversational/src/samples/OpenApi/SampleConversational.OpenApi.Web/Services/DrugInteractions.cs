// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace SampleConversational.OpenApi.Web.Services;

/// <summary>
/// Request body for <c>checkDrugInteraction</c>. <c>Locale</c> is injected by the platform
/// through <c>runtimeParamBindings</c> (target: body); the orchestrator fills the medications.
/// </summary>
public sealed record DrugInteractionRequest(string MedicationA, string MedicationB, string? Locale = null);

/// <summary>
/// A citation for an interaction finding. Projected as an Evidence Link by <c>customExtractors</c>.
/// </summary>
public sealed record InteractionSource(string Title, Uri Url);

/// <summary>
/// Response for <c>checkDrugInteraction</c>. <c>Summary</c> is projected as Response Text.
/// </summary>
public sealed record DrugInteractionResponse(
    string Summary,
    string Severity,
    IReadOnlyList<InteractionSource> Sources,
    string? CorrelationId);

/// <summary>
/// Synthetic, deterministic interaction table used by the sample. Not for clinical use.
/// </summary>
public static class DrugInteractions
{
    private static readonly Uri SampleSource = new("https://example.com/interactions");

    private static readonly Dictionary<(string, string), (string Severity, string Description)> Table = new()
    {
        [Key("warfarin", "aspirin")] = ("major", "Concurrent use increases bleeding risk."),
        [Key("lisinopril", "spironolactone")] = ("moderate", "Concurrent use may raise serum potassium."),
        [Key("simvastatin", "clarithromycin")] = ("major", "Clarithromycin can raise simvastatin levels and myopathy risk."),
        [Key("metformin", "lisinopril")] = ("none", "No clinically significant interaction is expected."),
    };

    /// <summary>
    /// Checks the synthetic interaction table for a medication pair (order-insensitive).
    /// </summary>
    public static DrugInteractionResponse Check(DrugInteractionRequest request, string? correlationId = null)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (Table.TryGetValue(Key(request.MedicationA, request.MedicationB), out var hit))
        {
            var summary = $"{request.MedicationA} + {request.MedicationB}: {hit.Severity} interaction. {hit.Description}";
            return new DrugInteractionResponse(summary, hit.Severity, [new InteractionSource("Sample interaction reference", SampleSource)], correlationId);
        }

        return new DrugInteractionResponse(
            $"No interaction data is available for {request.MedicationA} + {request.MedicationB} in this sample.",
            "unknown",
            [],
            correlationId);
    }

    private static (string, string) Key(string a, string b)
    {
        var x = a.Trim().ToUpperInvariant();
        var y = b.Trim().ToUpperInvariant();
        return string.CompareOrdinal(x, y) <= 0 ? (x, y) : (y, x);
    }
}
