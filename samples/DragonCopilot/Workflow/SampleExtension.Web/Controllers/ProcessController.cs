using Microsoft.AspNetCore.Mvc;
using SampleExtension.Web.Models;
using SampleExtension.Web.Services;

namespace SampleExtension.Web.Controllers;

/// <summary>
/// Controller for processing requests from the Dragon Backend Simulator
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProcessController : ControllerBase
{
    private readonly IProcessingService _processingService;
    private readonly ILogger<ProcessController> _logger;

    public ProcessController(IProcessingService processingService, ILogger<ProcessController> logger)
    {
        _processingService = processingService;
        _logger = logger;
    }

    /// <summary>
    /// Processes data sent from the Dragon Backend Simulator
    /// </summary>
    /// <param name="request">The processing request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The processing response</returns>
    /// <response code="200">Request processed successfully</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="500">Internal server error</response>
    [HttpPost]
    [ProducesResponseType(typeof(ProcessResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProcessResponse>> ProcessData(
        [FromBody] ProcessRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request.RequestId == Guid.Empty)
            {
                request.RequestId = Guid.NewGuid();
            }

            var response = await _processingService.ProcessAsync(request, cancellationToken);
            
            if (response.Success)
            {
                return Ok(response);
            }
            else
            {
                return StatusCode(StatusCodes.Status500InternalServerError, response);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error occurred while processing request");
            return Problem(
                title: "Internal Server Error",
                detail: "An unexpected error occurred while processing the request",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }    /// <summary>
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
                process = "/api/process",
                echo = "/api/process/echo",
                swagger = "/"
            }
        });
    }

    /// <summary>
    /// Echo endpoint for testing connectivity
    /// </summary>
    /// <param name="message">Message to echo back</param>
    /// <returns>The echoed message</returns>
    [HttpPost("echo")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public ActionResult Echo([FromBody] string message)
    {
        return Ok(new 
        { 
            originalMessage = message,
            echoedMessage = $"Echo: {message}",
            timestamp = DateTime.UtcNow
        });
    }
}
