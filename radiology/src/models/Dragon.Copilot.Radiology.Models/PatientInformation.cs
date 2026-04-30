using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiology.Models
{
    /// <summary>
    /// Patient demographic information.
    /// </summary>
    /// <remarks>
    /// Corresponds to the PatientInformation schema defined in PatientInformation.yaml.
    /// </remarks>
    /// <example>
    /// <code>
    /// var patientInfo = new PatientInformation
    /// {
    ///     DateOfBirth = new DateOnly(1990, 1, 15),
    ///     BiologicalSex = BiologicalSex.Male,
    /// };
    /// </code>
    /// </example>
    public class PatientInformation
    {
        /// <summary>
        /// Gets or sets the date of birth of the patient in YYYY-MM-DD format.
        /// </summary>
        [JsonPropertyName("dateOfBirth")]
        public DateOnly? DateOfBirth { get; set; }

        /// <summary>
        /// Gets or sets the biological sex of the patient.
        /// </summary>
        [JsonPropertyName("biologicalSex")]
        public BiologicalSex? BiologicalSex { get; set; }
    }
}
