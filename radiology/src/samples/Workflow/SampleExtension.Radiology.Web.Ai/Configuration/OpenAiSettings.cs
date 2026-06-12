namespace SampleExtension.Radiology.Web.Ai.Configuration;

/// <summary>
/// Settings for OpenAI configuration.
/// </summary>
public class OpenAiSettings
{
    /// <summary>
    /// Configuration section name for OpenAI settings.
    /// </summary>
    public const string SectionName = "OpenAI";

    /// <summary>
    /// Endpoint for the OpenAI service.
    /// </summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>
    /// API key for authenticating with the OpenAI service.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Deployment name of the OpenAI model to be used.
    /// </summary>
    public string DeploymentName { get; set; } = string.Empty;
}
