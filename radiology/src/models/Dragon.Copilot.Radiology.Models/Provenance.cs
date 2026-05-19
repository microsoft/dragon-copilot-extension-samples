using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models
{
    /// <summary>
    /// Identifies a section in the report that was used to generate a recommendation.
    /// </summary>
    /// <remarks>
    /// Corresponds to the Provenance schema defined in QualityCheckResult.yaml.
    /// </remarks>
    public class Provenance
    {
        /// <summary>
        /// Gets or sets the section of the actual report text associated with this recommendation.
        /// </summary>
        [JsonPropertyName("text")]
        public string? Text { get; set; }

        /// <summary>
        /// Gets or sets the offset within the report text that marks the start of the section
        /// that was used to generate this recommendation.
        /// </summary>
        [JsonPropertyName("startPosition")]
        public double? StartPosition { get; set; }

        /// <summary>
        /// Gets or sets the offset within the report text that marks the end of the section
        /// that was used to generate this recommendation.
        /// </summary>
        [JsonPropertyName("endPosition")]
        public double? EndPosition { get; set; }
    }
}
