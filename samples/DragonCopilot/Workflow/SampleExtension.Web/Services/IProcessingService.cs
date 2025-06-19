// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Threading;
using System.Threading.Tasks;
using SampleExtension.Web.Models;

namespace SampleExtension.Web.Services;

/// <summary>
/// Service interface for processing requests from the Dragon Backend Simulator
/// </summary>
public interface IProcessingService
{
    /// <summary>
    /// Processes the incoming request and returns a response
    /// </summary>
    /// <param name="request">The processing request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The processing response</returns>
    Task<ProcessResponse> ProcessAsync(ProcessRequest request, CancellationToken cancellationToken = default);
}
