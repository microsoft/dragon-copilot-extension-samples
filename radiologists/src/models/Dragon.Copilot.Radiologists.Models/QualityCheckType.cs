using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models
{
    /// <summary>
    /// The type of quality check.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum QualityCheckType
    {
        /// <summary>
        /// Billing quality check.
        /// </summary>
        Billing,

        /// <summary>
        /// Clinical quality check.
        /// </summary>
        Clinical,
    }
}
