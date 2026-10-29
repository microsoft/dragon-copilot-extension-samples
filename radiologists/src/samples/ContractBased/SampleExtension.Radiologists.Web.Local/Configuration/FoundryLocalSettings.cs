namespace SampleExtension.Radiologists.Web.Local.Configuration;

/// <summary>
/// Settings for Microsoft.AI.Foundry.Local on-device model inference.
/// </summary>
public class FoundryLocalSettings
{
    /// <summary>
    /// Configuration section name for Foundry Local settings.
    /// </summary>
    public const string SectionName = "FoundryLocal";

    /// <summary>
    /// Foundry Local model alias to download and load.
    /// Alternatives: qwen2.5-0.5b, phi-3.5-mini, phi-4-mini, mistral-7b, gpt-oss-20b.
    /// </summary>
    public string ModelAlias { get; set; } = "qwen2.5-1.5b";

    /// <summary>
    /// Hardware device used for inference. Valid values: CPU, GPU, NPU.
    /// </summary>
    public string DeviceType { get; set; } = "CPU";

    /// <summary>
    /// Application name passed to FoundryLocalManager. Used for log/data directory naming.
    /// </summary>
    public string AppName { get; set; } = "DragonCopilot-Radiologists-Sample";

    /// <summary>
    /// Local directory used by Foundry Local for the model cache and logs.
    /// When null or empty, defaults to <c>~/.foundry</c>. Override with an absolute path to use a different location.
    /// </summary>
    public string AppDataDir { get; set; } = string.Empty;
}
