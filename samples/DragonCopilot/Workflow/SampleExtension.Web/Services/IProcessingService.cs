// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Threading;
using System.Threading.Tasks;
using Dragon.Copilot.Models;

namespace SampleExtension.Web.Services;

/// <summary>
/// Service interface for processing Dragon Standard payloads
/// </summary>
public interface IProcessingService
{
    /// <summary>
    /// Processes the incoming Dragon Standard payload and returns a response
    /// </summary>
    /// <param name="payload">The Dragon Standard payload</param>
    /// <param name="requestId">Request identifier from headers</param>
    /// <param name="correlationId">Correlation identifier from headers</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The processing response</returns>
    Task<ProcessResponse> ProcessAsync(
        DragonStandardPayload payload,
        string? requestId = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default);
}
