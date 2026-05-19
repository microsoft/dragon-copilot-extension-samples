using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models
{
    /// <summary>
    /// Represents the quality check result payload containing billing and clinical recommendations.
    /// </summary>
    /// <remarks>
    /// Corresponds to the QualityCheckResult schema defined in QualityCheckResult.yaml.
    /// The recommendations list will be empty if there are no recommendations.
    /// </remarks>
    /// <example>
    /// <code>
    /// var result = new QualityCheckResult
    /// {
    ///     Recommendations = new Collection&lt;Recommendation&gt;
    ///     {
    ///         new Recommendation
    ///         {
    ///             QualityCheckType = QualityCheckType.Billing,
    ///             Description = "Missing CPT modifier for bilateral procedure.",
    ///             Reason = "Bilateral chest X-ray performed but only unilateral code submitted.",
    ///             SeverityScorePercent = 75,
    ///         },
    ///     },
    /// };
    /// </code>
    /// </example>
    public class QualityCheckResult
    {
        /// <summary>
        /// Gets or sets the array of quality check recommendations.
        /// This will be an empty list if there are no recommendations.
        /// </summary>
        [Required]
        [JsonPropertyName("recommendations")]
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Usage", "CA2227:Collection properties should be read only", Justification = "Needed for deserialization of partner payloads")]
        public Collection<Recommendation> Recommendations { get; set; } = null!;
    }
}
