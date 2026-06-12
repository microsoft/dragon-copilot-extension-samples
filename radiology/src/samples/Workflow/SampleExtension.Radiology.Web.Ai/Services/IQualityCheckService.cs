using Dragon.Copilot.Radiology.Models;

namespace SampleExtension.Radiology.Web.Ai.Services;

/// <summary>
/// Abstraction for the component that turns an incoming radiology report
/// into a <see cref="ProcessResponse"/>. In this sample it dispatches to
/// Azure OpenAI or a Foundry Local model. Replace with your own implementation.
/// </summary>
public interface IQualityCheckService
{
    Task<ProcessResponse> ProcessAsync(ProcessRequest payload, CancellationToken cancellationToken = default);
}
