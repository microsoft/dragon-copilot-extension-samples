using Dragon.Copilot.Radiologists.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SampleExtension.Radiologists.Web.Local.Services;

namespace SampleExtension.Radiologists.Web.Local.Controllers;

/// <summary>
/// Single entry point of the Radiologists simple extension.
/// Demonstrates a single-endpoint extension with model binding performed by
/// the framework, with the endpoint protected by JWT bearer authentication
/// (Microsoft Entra ID) via the "RequiredClaims" authorization policy.
/// </summary>
[ApiController]
[Route("v1")]
[Produces("application/json")]
[Authorize(Policy = "RequiredClaims")]
public sealed class QualityCheckController : ControllerBase
{
    private readonly IQualityCheckService _qualityCheckService;
    private readonly ILogger<QualityCheckController> _logger;

    public QualityCheckController(IQualityCheckService qualityCheckService, ILogger<QualityCheckController> logger)
    {
        ArgumentNullException.ThrowIfNull(qualityCheckService);
        ArgumentNullException.ThrowIfNull(logger);

        _qualityCheckService = qualityCheckService;
        _logger = logger;
    }

    /// <summary>
    /// Analyzes a radiology report and returns a list of quality-check recommendations.
    /// </summary>
    /// <remarks>
    /// This sample runs an on-device Foundry Local model. Replace <see cref="IQualityCheckService.ProcessAsync"/>
    /// with your real implementation.
    /// </remarks>
    [HttpPost("process")]
    [ProducesResponseType(typeof(ProcessResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProcessResponse>> PostAsync([FromBody] ProcessRequest payload, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(payload);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        _logger.LogInformation(
            "Received {Method} {Path} - CorrelationId={CorrelationId}",
            Request.Method,
            Request.Path,
            payload.SessionData.CorrelationId);

        var result = await _qualityCheckService.ProcessAsync(payload, cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Response {Method} {Path} - Success: {Success} - Message: {Message}",
            Request.Method,
            Request.Path,
            result.Success,
            result.Message);

        return Ok(result);
    }
}
