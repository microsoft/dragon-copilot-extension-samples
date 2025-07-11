// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using DragonBackendSimulator.Web.Controllers;
using DragonBackendSimulator.Web.Models;
using DragonBackendSimulator.Web.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace DragonBackendSimulator.Tests.Controllers;

public class EncountersControllerTests
{
    private readonly IEncounterService _encounterService;
    private readonly ILogger<EncountersController> _logger;
    private readonly EncountersController _controller;

    public EncountersControllerTests()
    {
        _encounterService = Substitute.For<IEncounterService>();
        _logger = Substitute.For<ILogger<EncountersController>>();
        _controller = new EncountersController(_encounterService, _logger);
    }

    [Fact]
    public void HealthCheck_ReturnsOkResult_WithCorrectStatus()
    {
        // Act
        var result = _controller.HealthCheck();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        // Verify the response contains expected properties
        var response = okResult.Value;
        var responseType = response!.GetType();

        var serviceProperty = responseType.GetProperty("service");
        Assert.NotNull(serviceProperty);
        Assert.Equal("Dragon Backend Simulator", serviceProperty.GetValue(response));

        var statusProperty = responseType.GetProperty("status");
        Assert.NotNull(statusProperty);
        Assert.Equal("healthy", statusProperty.GetValue(response));
    }

    [Fact]
    public async Task SimulateEncounter_WithValidRequest_ReturnsOkResult()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");

        var expectedResponse = new ExtensionResponse
        {
            Id = Guid.NewGuid(),
            Name = "Test Encounter",
            Status = EncounterStatus.Completed
        };

        _encounterService.CallExtensionAsync(request, Arg.Any<CancellationToken>())
            .Returns(expectedResponse);

        // Act
        var result = await _controller.SimulateEncounter(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var actualResponse = Assert.IsType<ExtensionResponse>(okResult.Value);
        Assert.Equal(expectedResponse.Id, actualResponse.Id);
        Assert.Equal(expectedResponse.Status, actualResponse.Status);
    }

    [Fact]
    public async Task SimulateEncounter_WithHttpRequestException_ReturnsBadGateway()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");

        var httpException = new HttpRequestException("External API error");
        _encounterService.CallExtensionAsync(request, Arg.Any<CancellationToken>())
            .ThrowsAsyncForAnyArgs(httpException);

        // Act
        var result = await _controller.SimulateEncounter(request);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status502BadGateway, objectResult.StatusCode);

        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("External API Error", problemDetails.Title);
        Assert.Equal("External API error", problemDetails.Detail);
    }

    [Fact]
    public async Task SimulateEncounter_WithTimeoutException_ReturnsRequestTimeout()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");

        var timeoutException = new TaskCanceledException("Timeout", new TimeoutException());
        _encounterService.CallExtensionAsync(request, Arg.Any<CancellationToken>())
            .ThrowsAsyncForAnyArgs(timeoutException);

        // Act
        var result = await _controller.SimulateEncounter(request);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status408RequestTimeout, objectResult.StatusCode);

        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("Request Timeout", problemDetails.Title);
        Assert.Equal("The external API request timed out", problemDetails.Detail);
    }

    [Fact]
    public async Task SimulateEncounter_WithGenericException_ReturnsInternalServerError()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");

        var genericException = new InvalidOperationException("Something went wrong");
        _encounterService.CallExtensionAsync(request, Arg.Any<CancellationToken>())
            .ThrowsAsyncForAnyArgs(genericException);

        // Act
        var result = await _controller.SimulateEncounter(request);

        // Assert
        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status500InternalServerError, objectResult.StatusCode);

        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("Internal Server Error", problemDetails.Title);
        Assert.Equal("An unexpected error occurred", problemDetails.Detail);
    }

    [Fact]
    public async Task SimulateEncounter_CallsEncounterService_WithCorrectParameters()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");

        var cancellationToken = CancellationToken.None;
        var expectedResponse = new ExtensionResponse
        {
            Id = Guid.NewGuid(),
            Status = EncounterStatus.Completed
        };

        _encounterService.CallExtensionAsync(request, cancellationToken)
            .Returns(expectedResponse);

        // Act
        await _controller.SimulateEncounter(request, cancellationToken);

        // Assert
        await _encounterService.Received(1).CallExtensionAsync(request, cancellationToken);
    }
}
