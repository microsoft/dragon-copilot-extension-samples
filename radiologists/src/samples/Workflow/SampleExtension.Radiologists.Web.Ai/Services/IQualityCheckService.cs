using Dragon.Copilot.Radiologists.Models;

namespace SampleExtension.Radiologists.Web.Ai.Services;

/// <summary>
/// Abstraction for the component that turns an incoming radiology report
/// into a <see cref="ProcessResponse"/>. In this sample it dispatches to
/// Azure OpenAI. Replace with your own implementation.
/// </summary>
public interface IQualityCheckService
{
    /// <summary>
    /// Whether the underlying provider has the configuration it needs to run —
    /// for the Azure OpenAI sample, the endpoint, API key, and deployment name.
    /// </summary>
    bool IsConfigured { get; }

    Task<ProcessResponse> ProcessAsync(ProcessRequest payload, CancellationToken cancellationToken = default);
}
