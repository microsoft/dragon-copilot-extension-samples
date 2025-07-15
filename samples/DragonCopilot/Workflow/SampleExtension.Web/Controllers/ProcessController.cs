// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Dragon.Copilot.Models;
using SampleExtension.Web.Attributes;
using SampleExtension.Web.Extensions;
using SampleExtension.Web.Services;

namespace SampleExtension.Web.Controllers;

/// <summary>
/// Controller for processing Dragon Standard payloads
/// </summary>
[ApiController]
[Route("v1")]
[Produces("application/json")]
public class ProcessController : ControllerBase
{
    private readonly IProcessingService _processingService;
    private readonly ILogger<ProcessController> _logger;

    /// <summary>
    /// Constructor for ProcessController
    /// </summary>
    /// <param name="processingService">The service that processes Dragon Standard payloads</param>
    /// <param name="logger">The logger</param>
    public ProcessController(IProcessingService processingService, ILogger<ProcessController> logger)
    {
        _processingService = processingService;
        _logger = logger;
    }

    /// <summary>
    /// Process Dragon Standard payload
    /// </summary>
    /// <param name="payload">The Dragon Standard payload containing note, transcript, iterative transcript and/or iterative audio data</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The processing response</returns>
    /// <response code="200">Successfully processed</response>
    /// <response code="400">Bad request</response>
    /// <response code="401">Unauthorized</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("process")]
    [Authorize] // This will handle JWT authentication when enabled
    [Authorization] // This will handle license key authorization when enabled
    [ProducesResponseType(typeof(ProcessResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProcessResponse>> ProcessDragonStandard(
        [FromBody] DragonStandardPayload payload,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(payload, nameof(payload));

        try
        {
            // Extract headers as per OpenAPI specification
            var requestId = Request.Headers["x-ms-request-id"].FirstOrDefault();
            var correlationId = Request.Headers["x-ms-correlation-id"].FirstOrDefault();

            var response = await _processingService.ProcessAsync(payload, requestId, correlationId, cancellationToken)
                .ConfigureAwait(false);

            if (response.Success)
            {
                return Ok(response);
            }

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                error = response.Message ?? "Internal server error occurred"
            });
        }
#pragma warning disable CA1031
        catch (Exception ex)
#pragma warning restore CA1031
        {
            _logger.LogUnexpectedProcessingException(ex);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                error = "Internal server error occurred"
            });
        }
    }

    /// <summary>
    /// Health check endpoint to verify the service is running
    /// </summary>
    /// <returns>Service status</returns>
    [HttpGet("health")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public ActionResult HealthCheck()
    {
        return Ok(new
        {
            service = "Dragon Sample Extension",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0",
            endpoints = new
            {
                process = "/v1/process",
                health = "/v1/health"
            }
        });
    }
}
