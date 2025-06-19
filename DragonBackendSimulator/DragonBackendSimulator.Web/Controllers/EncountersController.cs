using Microsoft.AspNetCore.Mvc;
using DragonBackendSimulator.Web.Models;
using DragonBackendSimulator.Web.Services;

namespace DragonBackendSimulator.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class EncountersController : ControllerBase
{
    private readonly IEncounterService _encounterService;
    private readonly ILogger<EncountersController> _logger;

    public EncountersController(IEncounterService encounterService, ILogger<EncountersController> logger)
    {
        _encounterService = encounterService;
        _logger = logger;
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    /// <returns>Service status information</returns>
    /// <response code="200">Service is healthy</response>
    [HttpGet("/health")]
    public IActionResult HealthCheck()
    {
        return Ok(new
        {
            service = "Dragon Backend Simulator",
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0",
            endpoints = new
            {
                encounters = "/api/encounters",
                swagger = "/",
                openapi = "/openapi/v1.json"
            }
        });
    }

    /// <summary>
    /// Simulates a new encounter
    /// </summary>
    /// <param name="request">The encounter simulation request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The simulated encounter</returns>
    /// <response code="200">Encounter simulated successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="408">Request timeout</response>
    /// <response code="502">External API error</response>
    /// <response code="500">Internal server error</response>
    [HttpPost("/api/encounters:simulate")]
    [ProducesResponseType(typeof(ExtensionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status408RequestTimeout)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ExtensionResponse>> SimulateEncounter(
        [FromBody] EncounterSimulationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var extensionResponse = await _encounterService.CallExtensionAsync(request, cancellationToken);
            return Ok(extensionResponse);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error occurred while simulating encounter");
            return Problem(
                title: "External API Error",
                detail: ex.Message,
                statusCode: StatusCodes.Status502BadGateway
            );
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Timeout occurred while simulating encounter");
            return Problem(
                title: "Request Timeout",
                detail: "The external API request timed out",
                statusCode: StatusCodes.Status408RequestTimeout
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while simulating encounter");
            return Problem(
                title: "Internal Server Error",
                detail: "An unexpected error occurred",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }
}
