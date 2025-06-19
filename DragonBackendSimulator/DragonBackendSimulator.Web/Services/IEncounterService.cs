using DragonBackendSimulator.Web.Models;

namespace DragonBackendSimulator.Web.Services;

public interface IEncounterService
{
    Task<ExtensionResponse> CallExtensionAsync(EncounterSimulationRequest simulationRequest, CancellationToken cancellationToken = default);
}
