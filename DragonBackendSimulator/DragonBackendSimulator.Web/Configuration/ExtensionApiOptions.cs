namespace DragonBackendSimulator.Web.Configuration;

public class ExtensionApiOptions
{
    public const string SectionName = "ExtensionApi";

    public string BaseUrl { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 30;
}
