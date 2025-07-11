// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DragonBackendSimulator.Web.Configuration;
using DragonBackendSimulator.Web.Models;
using DragonBackendSimulator.Web.Services;
using Dragon.Copilot.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace DragonBackendSimulator.Tests.Services;

public sealed class EncounterServiceTests : IDisposable
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<EncounterService> _logger;
    private readonly IOptions<ExtensionApiOptions> _extensionApiOptions;
    private readonly JsonSerializerOptions _jsonSerializerOptions;
    private readonly HttpClient _httpClient;
    private readonly TestHttpMessageHandler _httpMessageHandler;
    private readonly EncounterService _encounterService;

    public EncounterServiceTests()
    {
        _httpClientFactory = Substitute.For<IHttpClientFactory>();
        _logger = Substitute.For<ILogger<EncounterService>>();
        _extensionApiOptions = Substitute.For<IOptions<ExtensionApiOptions>>();
        _jsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var extensionApiOptions = new ExtensionApiOptions
        {
            BaseUrl = new Uri("https://api.example.com"),
            Path = "/api/process",
            TimeoutSeconds = 30
        };

        _extensionApiOptions.Value.Returns(extensionApiOptions);

        _httpMessageHandler = new TestHttpMessageHandler();
        _httpClient = new HttpClient(_httpMessageHandler)
        {
            BaseAddress = extensionApiOptions.BaseUrl
        };
        _httpClientFactory.CreateClient("EncounterApi").Returns(_httpClient);

        _encounterService = new EncounterService(
            _httpClientFactory,
            _jsonSerializerOptions,
            _logger,
            _extensionApiOptions);
    }

    [Fact]
    public async Task CallExtensionAsync_WithNullRequest_ThrowsArgumentNullException()
    {
        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _encounterService.CallExtensionAsync(null!));

        Assert.Equal("simulationRequest", exception.ParamName);
    }

    [Fact]
    public async Task CallExtensionAsync_WithValidRequest_ReturnsSuccessfulResponse()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var expectedResponse = new ProcessResponse { Success = true, Message = "Processed successfully" };
        var responseJson = JsonSerializer.Serialize(expectedResponse, _jsonSerializerOptions);

        _httpMessageHandler.SetResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Encounter", result.Name);
        Assert.Equal("Test Description", result.Description);
        Assert.Equal(EncounterStatus.Completed, result.Status);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal(responseJson, result.ExternalApiResponse);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.True(result.CreatedAt <= DateTime.UtcNow);
        Assert.True(result.CompletedAt <= DateTime.UtcNow);
        Assert.True(result.CompletedAt >= result.CreatedAt);
    }

    [Fact]
    public async Task CallExtensionAsync_WithValidRequestAndNoDescription_ReturnsSuccessfulResponse()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter");
        var expectedResponse = new ProcessResponse { Success = true, Message = "Processed successfully" };
        var responseJson = JsonSerializer.Serialize(expectedResponse, _jsonSerializerOptions);

        _httpMessageHandler.SetResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Encounter", result.Name);
        Assert.Null(result.Description);
        Assert.Equal(EncounterStatus.Completed, result.Status);
    }

    [Fact]
    public async Task CallExtensionAsync_WithSuccessfulResponseButProcessingFailed_ReturnsFailedStatus()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var expectedResponse = new ProcessResponse { Success = false, Message = "Processing failed" };
        var responseJson = JsonSerializer.Serialize(expectedResponse, _jsonSerializerOptions);

        _httpMessageHandler.SetResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Failed, result.Status);
        Assert.Equal("Processing failed", result.ErrorMessage);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task CallExtensionAsync_WithSuccessfulResponseButEmptyProcessingMessage_ReturnsFailedStatusWithDefaultMessage()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var expectedResponse = new ProcessResponse { Success = false, Message = null };
        var responseJson = JsonSerializer.Serialize(expectedResponse, _jsonSerializerOptions);

        _httpMessageHandler.SetResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Failed, result.Status);
        Assert.Equal("Extension processing failed", result.ErrorMessage);
    }

    [Fact]
    public async Task CallExtensionAsync_WithSuccessfulResponseButInvalidJson_ReturnsCompletedStatus()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var invalidJson = "{ invalid json }";

        _httpMessageHandler.SetResponse(HttpStatusCode.OK, invalidJson);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Completed, result.Status);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal(invalidJson, result.ExternalApiResponse);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task CallExtensionAsync_WithHttpErrorResponse_ReturnsFailedStatus()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");

        _httpMessageHandler.SetResponse(HttpStatusCode.BadRequest, "Bad Request");

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Failed, result.Status);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Extension API call failed with status BadRequest: Bad Request", result.ErrorMessage);
    }

    [Fact]
    public async Task CallExtensionAsync_WithHttpRequestException_ReturnsFailedStatus()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var exception = new HttpRequestException("Network error");

        _httpMessageHandler.SetException(exception);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Failed, result.Status);
        Assert.Equal("Network error", result.ErrorMessage);
    }

    [Fact]
    public async Task CallExtensionAsync_WithTaskCanceledException_ReturnsFailedStatus()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var exception = new TaskCanceledException("Operation was canceled");

        _httpMessageHandler.SetException(exception);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Failed, result.Status);
        Assert.Equal("Operation was canceled", result.ErrorMessage);
    }

    [Fact]
    public async Task CallExtensionAsync_WithGenericException_ReturnsFailedStatus()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        var exception = new InvalidOperationException("Something went wrong");

        _httpMessageHandler.SetException(exception);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(EncounterStatus.Failed, result.Status);
        Assert.Equal("Something went wrong", result.ErrorMessage);
    }

    [Fact]
    public async Task CallExtensionAsync_CreatesCorrectHttpClientName()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter");
        _httpMessageHandler.SetResponse(HttpStatusCode.OK, "{}");

        // Act
        await _encounterService.CallExtensionAsync(request);

        // Assert
        _httpClientFactory.Received(1).CreateClient("EncounterApi");
    }

    [Fact]
    public async Task CallExtensionAsync_SendsPostRequestToCorrectPath()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter");
        _httpMessageHandler.SetResponse(HttpStatusCode.OK, "{}");

        // Act
        await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.Equal(HttpMethod.Post, _httpMessageHandler.LastRequest?.Method);
        Assert.Equal("https://api.example.com/api/process", _httpMessageHandler.LastRequest?.RequestUri?.ToString());
    }

    [Fact]
    public async Task CallExtensionAsync_SendsCorrectContentType()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter");
        _httpMessageHandler.SetResponse(HttpStatusCode.OK, "{}");

        // Act
        await _encounterService.CallExtensionAsync(request);

        // Assert
        Assert.Equal("application/json", _httpMessageHandler.LastRequest?.Content?.Headers.ContentType?.MediaType);
        Assert.Equal("utf-8", _httpMessageHandler.LastRequest?.Content?.Headers.ContentType?.CharSet);
    }

    [Fact]
    public async Task CallExtensionAsync_SendsCorrectPayloadStructure()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter", "Test Description");
        _httpMessageHandler.SetResponse(HttpStatusCode.OK, "{}");

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert
        var requestBody = _httpMessageHandler.LastRequestContent;
        var payload = JsonSerializer.Deserialize<DragonStandardPayload>(requestBody, _jsonSerializerOptions);

        Assert.NotNull(payload);
        Assert.NotNull(payload.SessionData);
        Assert.NotNull(payload.Note);

        // Verify SessionData
        Assert.Equal(result.Id.ToString(), payload.SessionData.CorrelationId);
        Assert.Equal("dragon-backend-simulator", payload.SessionData.TenantId);
        Assert.Equal(result.CreatedAt, payload.SessionData.SessionStart);

        // Verify Note
        Assert.Equal("1.0", payload.Note.PayloadVersion);
        Assert.Equal("1.0", payload.Note.SchemaVersion);
        Assert.Equal("en-US", payload.Note.Language);
        Assert.Equal("normal", payload.Note.Priority);
        Assert.Equal("Test Encounter", payload.Note.Document!.Title);
        Assert.Equal("Encounter Simulation", payload.Note.Document.Type!.Text);
        Assert.Single(payload.Note.Resources!);
        Assert.Equal(result.Id.ToString(), payload.Note.Resources[0].LegacyId);
        Assert.Equal("Encounter: Test Encounter - Test Description", payload.Note.Resources[0].Content);
    }

    [Fact]
    public async Task CallExtensionAsync_WithoutDescriptionInRequest_CreatesCorrectContent()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter");
        _httpMessageHandler.SetResponse(HttpStatusCode.OK, "{}");

        // Act
        await _encounterService.CallExtensionAsync(request);

        // Assert
        var requestBody = _httpMessageHandler.LastRequestContent;
        var payload = JsonSerializer.Deserialize<DragonStandardPayload>(requestBody, _jsonSerializerOptions);

        Assert.NotNull(payload?.Note?.Resources);
        Assert.Single(payload.Note.Resources);
        Assert.Equal("Encounter: Test Encounter", payload.Note.Resources[0].Content);
    }

    [Fact]
    public async Task CallExtensionAsync_VerifyEncounterStatusProgression()
    {
        // Arrange
        var request = new EncounterSimulationRequest("Test Encounter");
        var successResponse = new ProcessResponse { Success = true, Message = "Processed successfully" };
        var responseJson = JsonSerializer.Serialize(successResponse, _jsonSerializerOptions);
        _httpMessageHandler.SetResponse(HttpStatusCode.OK, responseJson);

        // Act
        var result = await _encounterService.CallExtensionAsync(request);

        // Assert - Verify the encounter went through the correct status progression
        // Initial status would be Created when the encounter object is first created
        // Final status should be Completed for successful responses
        Assert.Equal(EncounterStatus.Completed, result.Status);
        Assert.NotNull(result.CompletedAt);
        Assert.True(result.CompletedAt > result.CreatedAt);
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
        _httpMessageHandler?.Dispose();
        GC.SuppressFinalize(this);
    }
}

/// <summary>
/// Test HTTP message handler that allows us to control HTTP responses in tests
/// </summary>
internal sealed class TestHttpMessageHandler : HttpMessageHandler
{
    private HttpResponseMessage _response = new HttpResponseMessage(HttpStatusCode.OK)
    {
        Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json")
    };
    private Exception _exception = null!;

    public HttpRequestMessage LastRequest { get; private set; } = null!;
    public CancellationToken LastCancellationToken { get; private set; }
    public string LastRequestContent { get; private set; } = string.Empty;

    public void SetResponse(HttpStatusCode statusCode, string content)
    {
        _response?.Dispose(); // Dispose the old response
        _response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(content, System.Text.Encoding.UTF8, "application/json")
        };
        _exception = null!;
    }

    public void SetException(Exception exception)
    {
        _exception = exception;
        _response = null!;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        LastCancellationToken = cancellationToken;

        // Capture the request content before it potentially gets disposed
        if (request.Content != null)
        {
            LastRequestContent = await request.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        }

        if (_exception != null)
        {
            throw _exception;
        }

        return _response;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _response?.Dispose();
        }
        base.Dispose(disposing);
    }
}
