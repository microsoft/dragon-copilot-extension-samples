// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Text.RegularExpressions;

namespace SampleConversational.Mcp.Web.Services;

/// <summary>
/// An order detected in a transcript.
/// </summary>
public sealed record ExtractedOrder(string Category, string Description);

/// <summary>
/// Result of <see cref="ClinicalReference.ExtractOrders"/>. <c>Summary</c> is projected as the
/// tool's Response Text through the manifest's <c>customExtractors</c>.
/// </summary>
public sealed record OrderExtractionResult(string Summary, IReadOnlyList<ExtractedOrder> Orders, string? ConversationId);

/// <summary>
/// A laboratory reference range.
/// </summary>
public sealed record ReferenceRange(string Test, string Range, string Units, string Summary);

/// <summary>
/// Synthetic, deterministic clinical logic used by the sample MCP tools.
/// Replace with your own business logic. Not for clinical use.
/// </summary>
public static partial class ClinicalReference
{
    private static readonly Dictionary<string, ReferenceRange> Ranges = new(StringComparer.OrdinalIgnoreCase)
    {
        ["hba1c"] = new("HbA1c", "4.0-5.6", "%", "Typical adult HbA1c reference range is 4.0-5.6 %."),
        ["potassium"] = new("Potassium", "3.5-5.0", "mmol/L", "Typical adult serum potassium reference range is 3.5-5.0 mmol/L."),
        ["sodium"] = new("Sodium", "135-145", "mmol/L", "Typical adult serum sodium reference range is 135-145 mmol/L."),
        ["tsh"] = new("TSH", "0.4-4.0", "mIU/L", "Typical adult TSH reference range is 0.4-4.0 mIU/L."),
    };

    private static readonly (string Category, Regex Pattern)[] OrderPatterns =
    [
        ("Lab", LabPattern()),
        ("Imaging", ImagingPattern()),
        ("Medication", MedicationPattern()),
        ("Referral", ReferralPattern()),
    ];

    /// <summary>
    /// Looks up a synthetic reference range for a lab test.
    /// </summary>
    public static ReferenceRange? LookupReferenceRange(string test)
    {
        ArgumentNullException.ThrowIfNull(test);
        return Ranges.TryGetValue(test.Trim(), out var range) ? range : null;
    }

    /// <summary>
    /// Extracts orders from a transcript with simple keyword matching.
    /// </summary>
    public static OrderExtractionResult ExtractOrders(string transcript, string? conversationId = null)
    {
        ArgumentNullException.ThrowIfNull(transcript);

        var orders = new List<ExtractedOrder>();
        foreach (var sentence in transcript.Split(['.', '\n', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            foreach (var (category, pattern) in OrderPatterns)
            {
                if (pattern.IsMatch(sentence))
                {
                    orders.Add(new ExtractedOrder(category, sentence));
                    break;
                }
            }
        }

        var summary = orders.Count == 0
            ? "No orders were found in the transcript."
            : $"Found {orders.Count} order(s): " + string.Join("; ", orders.Select(o => $"{o.Category}: {o.Description}"));

        return new OrderExtractionResult(summary, orders, conversationId);
    }

    [GeneratedRegex(@"\b(order|draw|check|get)\b.*\b(lab|labs|cbc|bmp|cmp|a1c|hba1c|panel|potassium|tsh)\b", RegexOptions.IgnoreCase)]
    private static partial Regex LabPattern();

    [GeneratedRegex(@"\b(x-ray|xray|ct|mri|ultrasound|imaging)\b", RegexOptions.IgnoreCase)]
    private static partial Regex ImagingPattern();

    [GeneratedRegex(@"\b(start|prescribe|increase|decrease|refill)\b", RegexOptions.IgnoreCase)]
    private static partial Regex MedicationPattern();

    [GeneratedRegex(@"\b(refer|referral)\b", RegexOptions.IgnoreCase)]
    private static partial Regex ReferralPattern();
}
