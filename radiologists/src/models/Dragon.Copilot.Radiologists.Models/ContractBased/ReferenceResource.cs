using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models
{
    /// <summary>
    /// A reference resource that helps understand the recommendation.
    /// </summary>
    /// <remarks>
    /// Corresponds to the ReferenceResource schema defined in radiologists-extensibility-api.yaml.
    /// Examples include a website URL, PDF document name, or chat prompt.
    /// </remarks>
    public class ReferenceResource
    {
        /// <summary>
        /// Gets or sets the type of reference resource (e.g., website URL, PDF document name, chat prompt).
        /// </summary>
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        /// <summary>
        /// Gets or sets the content of the reference resource.
        /// </summary>
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }
}
