using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models
{
    /// <summary>
    /// A quality check recommendation produced by a DCR extension.
    /// </summary>
    /// <remarks>
    /// Corresponds to the Recommendation schema defined in radiology-extensibility-api.yaml.
    /// </remarks>
    /// <example>
    /// <code>
    /// var recommendation = new Recommendation
    /// {
    ///     QualityCheckType = QualityCheckType.Billing,
    ///     Description = "Missing CPT modifier for bilateral procedure.",
    ///     Reason = "Bilateral chest X-ray performed but only unilateral code submitted.",
    ///     SeverityScorePercent = 75,
    ///     Provenance = new Collection&lt;Provenance&gt;
    ///     {
    ///         new Provenance
    ///         {
    ///             Text = "Bilateral chest X-ray",
    ///             StartPosition = 0,
    ///             EndPosition = 22,
    ///         },
    ///     },
    ///     ReferenceResources = new Collection&lt;ReferenceResource&gt;
    ///     {
    ///         new ReferenceResource
    ///         {
    ///             Type = "website",
    ///             Content = "https://example.com/cpt-guidelines",
    ///         },
    ///     },
    ///     AdditionalInfo = new Dictionary&lt;string, string&gt;
    ///     {
    ///         ["cptCode"] = "71046",
    ///     },
    /// };
    /// </code>
    /// </example>
    public class Recommendation
    {
        /// <summary>
        /// Gets or sets the type of quality check.
        /// </summary>
        [Required]
        [JsonPropertyName("qualityCheckType")]
        public QualityCheckType QualityCheckType { get; set; }

        /// <summary>
        /// Gets or sets the description of the recommendation.
        /// </summary>
        [Required]
        [JsonPropertyName("description")]
        public string Description { get; set; } = null!;

        /// <summary>
        /// Gets or sets the reason for this recommendation.
        /// </summary>
        [Required]
        [JsonPropertyName("reason")]
        public string Reason { get; set; } = null!;

        /// <summary>
        /// Gets or sets the severity of the recommendation as a percentage (0–100).
        /// </summary>
        [JsonPropertyName("severityScorePercent")]
        public double? SeverityScorePercent { get; set; }

        /// <summary>
        /// Gets or sets the list of sections in the report that were used to generate this recommendation.
        /// </summary>
        [JsonPropertyName("provenance")]
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
        public Collection<Provenance>? Provenance { get; set; }

        /// <summary>
        /// Gets or sets the list of reference resources that help understand the recommendation.
        /// </summary>
        [JsonPropertyName("referenceResources")]
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
        public Collection<ReferenceResource>? ReferenceResources { get; set; }

        /// <summary>
        /// Gets or sets additional information as a dictionary of name-value pairs.
        /// Partners can use this to send any extra information regarding their recommendations.
        /// </summary>
        [JsonPropertyName("additionalInfo")]
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
        public Dictionary<string, string>? AdditionalInfo { get; set; }
    }
}
