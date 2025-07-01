using System.Threading;
using System.Threading.Tasks;
using DragonBackendSimulator.Web.Models;
using Dragon.Copilot.Models;

namespace DragonBackendSimulator.Web.Services;

public interface IEncounterService
{
    Task<ExtensionResponse> CallExtensionAsync(EncounterSimulationRequest simulationRequest, CancellationToken cancellationToken = default);
}
