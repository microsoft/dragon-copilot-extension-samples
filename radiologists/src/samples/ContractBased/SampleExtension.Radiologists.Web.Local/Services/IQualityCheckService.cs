using Dragon.Copilot.Radiologists.Models;

namespace SampleExtension.Radiologists.Web.Local.Services;

/// <summary>
/// Abstraction for the component that turns an incoming radiology report
/// into a <see cref="ProcessResponse"/>. In this sample it runs inference on
/// an on-device Foundry Local model. Replace with your own implementation.
/// </summary>
public interface IQualityCheckService
{
    Task<ProcessResponse> ProcessAsync(ProcessRequest payload, CancellationToken cancellationToken = default);
}
