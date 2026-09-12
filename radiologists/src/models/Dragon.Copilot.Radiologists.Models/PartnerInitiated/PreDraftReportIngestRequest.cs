using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// The request body a partnerInitiated tool posts to submit a pre-draft report.
/// </summary>
/// <remarks>
/// Corresponds to the PreDraftReportIngestRequest schema in
/// pre-draft-report-ingest-request-schema.json. The customer tenant and environment come from the
/// route, and the submitting partner is identified from the access token, so neither appears here.
/// </remarks>
public class PreDraftReportIngestRequest
{
    /// <summary>
    /// Gets or sets the marketplace publisher identifier.
    /// </summary>
    /// <remarks>
    /// Part of the (PublisherId, OfferId, PlanId) triple. Supply all three or none; side-loaded
    /// extensions have no triple and omit all three.
    /// </remarks>
    [JsonPropertyName("publisherId")]
    public string? PublisherId { get; set; }

    /// <summary>
    /// Gets or sets the marketplace offer identifier. Part of the triple.
    /// </summary>
    [JsonPropertyName("offerId")]
    public string? OfferId { get; set; }

    /// <summary>
    /// Gets or sets the marketplace plan identifier. Part of the triple.
    /// </summary>
    [JsonPropertyName("planId")]
    public string? PlanId { get; set; }

    /// <summary>
    /// Gets or sets the extension manifest's top-level name. Always required, including for
    /// marketplace extensions.
    /// </summary>
    [JsonPropertyName("manifestName")]
    public string ManifestName { get; set; } = null!;

    /// <summary>
    /// Gets or sets the extension manifest's top-level version.
    /// </summary>
    /// <remarks>
    /// Recorded rather than used to select the extension: the installed version is whatever the
    /// customer has deployed, which the partner does not control.
    /// </remarks>
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    /// <summary>
    /// Gets or sets the name of the tool within the manifest that produced this result.
    /// </summary>
    [JsonPropertyName("toolName")]
    public string ToolName { get; set; } = null!;

    /// <summary>
    /// Gets or sets the pre-draft report payload.
    /// </summary>
    [JsonPropertyName("draftReport")]
    public PreDraftReport DraftReport { get; set; } = null!;
}
