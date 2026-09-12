using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models
{
    /// <summary>
    /// Biological sex of the patient.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum BiologicalSex
    {
        /// <summary>
        /// Male.
        /// </summary>
        Male,

        /// <summary>
        /// Female.
        /// </summary>
        Female,

        /// <summary>
        /// Unknown.
        /// </summary>
        Unknown,

        /// <summary>
        /// Other.
        /// </summary>
        Other,
    }
}
