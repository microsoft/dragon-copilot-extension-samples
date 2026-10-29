using Dragon.Copilot.Radiologists.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SampleExtension.Radiologists.Web.Ai.Controllers;
using SampleExtension.Radiologists.Web.Ai.Services;
using Xunit;

namespace SampleExtension.Radiologists.Web.Ai.Tests;

public sealed class QualityCheckControllerTests
{
    private static ProcessRequest CreateRequest() =>
        new() { SessionData = new SessionData { CorrelationId = "test-correlation-id" } };

    private static QualityCheckController CreateController(IQualityCheckService service) =>
        new(service, NullLogger<QualityCheckController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
            ProblemDetailsFactory = new TestProblemDetailsFactory(),
        };

    private static Mock<IQualityCheckService> CreateService(bool isConfigured)
    {
        var service = new Mock<IQualityCheckService>();
        service.SetupGet(s => s.IsConfigured).Returns(isConfigured);
        return service;
    }

    [Fact]
    public async Task PostAsync_WhenConfiguredWithValidPayload_ReturnsOkWithServiceResult()
    {
        var expected = new ProcessResponse { Success = true, Message = "ok" };
        var service = CreateService(isConfigured: true);
        service
            .Setup(s => s.ProcessAsync(It.IsAny<ProcessRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await CreateController(service.Object).PostAsync(CreateRequest(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task PostAsync_WhenNotConfigured_Returns503ProblemDetails()
    {
        var result = await CreateController(CreateService(isConfigured: false).Object)
            .PostAsync(CreateRequest(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, objectResult.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal("Azure OpenAI is not configured", problem.Title);
    }

    [Fact]
    public async Task PostAsync_WithInvalidModelState_ReturnsBadRequest()
    {
        var controller = CreateController(CreateService(isConfigured: true).Object);
        controller.ModelState.AddModelError("report", "required");

        var result = await controller.PostAsync(CreateRequest(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task PostAsync_WithNullPayload_ThrowsArgumentNullException() =>
        await Assert.ThrowsAsync<ArgumentNullException>(
            () => CreateController(CreateService(isConfigured: true).Object).PostAsync(null!, CancellationToken.None));

    [Fact]
    public void Constructor_WithNullService_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckController(null!, NullLogger<QualityCheckController>.Instance));

    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckController(Mock.Of<IQualityCheckService>(), null!));

    private sealed class TestProblemDetailsFactory : ProblemDetailsFactory
    {
        public override ProblemDetails CreateProblemDetails(
            HttpContext httpContext, int? statusCode = null, string? title = null,
            string? type = null, string? detail = null, string? instance = null) =>
            new()
            {
                Status = statusCode,
                Title = title,
                Type = type,
                Detail = detail,
                Instance = instance,
            };

        public override ValidationProblemDetails CreateValidationProblemDetails(
            HttpContext httpContext, ModelStateDictionary modelStateDictionary, int? statusCode = null,
            string? title = null, string? type = null, string? detail = null, string? instance = null) =>
            new(modelStateDictionary)
            {
                Status = statusCode,
                Title = title,
                Type = type,
                Detail = detail,
                Instance = instance,
            };
    }
}
