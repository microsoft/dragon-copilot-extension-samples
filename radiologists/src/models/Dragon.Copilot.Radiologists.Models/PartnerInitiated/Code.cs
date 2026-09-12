using System.Text.Json.Serialization;

namespace Dragon.Copilot.Radiologists.Models;

/// <summary>
/// A coded reference within a report section.
/// </summary>
/// <remarks>
/// Corresponds to the Code definition in pre-draft-report-schema.json. Accepted systems are
/// SNOMED-CT, ICD-10, ICD-11, RadLex, LOINC and CPT.
/// </remarks>
public class Code
{
    /// <summary>
    /// Gets or sets the coding system the code belongs to.
    /// </summary>
    [JsonPropertyName("system")]
    public string System { get; set; } = null!;

    /// <summary>
    /// Gets or sets the code within the coding system.
    /// </summary>
    [JsonPropertyName("code")]
    public string CodeValue { get; set; } = null!;

    /// <summary>
    /// Gets or sets the human-readable display text for the code.
    /// </summary>
    [JsonPropertyName("display")]
    public string Display { get; set; } = null!;
}
