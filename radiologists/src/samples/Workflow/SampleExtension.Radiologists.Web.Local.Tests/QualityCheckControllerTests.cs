using Dragon.Copilot.Radiologists.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SampleExtension.Radiologists.Web.Local.Controllers;
using SampleExtension.Radiologists.Web.Local.Services;
using Xunit;

namespace SampleExtension.Radiologists.Web.Local.Tests;

public sealed class QualityCheckControllerTests
{
    private static ProcessRequest CreateRequest() =>
        new() { SessionData = new SessionData { CorrelationId = "test-correlation-id" } };

    private static QualityCheckController CreateController(IQualityCheckService service) =>
        new(service, NullLogger<QualityCheckController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };

    [Fact]
    public async Task PostAsync_WithValidPayload_ReturnsOkWithServiceResult()
    {
        var expected = new ProcessResponse { Success = true, Message = "ok" };
        var service = new Mock<IQualityCheckService>();
        service
            .Setup(s => s.ProcessAsync(It.IsAny<ProcessRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await CreateController(service.Object).PostAsync(CreateRequest(), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
    }

    [Fact]
    public async Task PostAsync_WithInvalidModelState_ReturnsBadRequest()
    {
        var controller = CreateController(Mock.Of<IQualityCheckService>());
        controller.ModelState.AddModelError("report", "required");

        var result = await controller.PostAsync(CreateRequest(), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task PostAsync_WithNullPayload_ThrowsArgumentNullException() =>
        await Assert.ThrowsAsync<ArgumentNullException>(
            () => CreateController(Mock.Of<IQualityCheckService>()).PostAsync(null!, CancellationToken.None));

    [Fact]
    public void Constructor_WithNullService_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckController(null!, NullLogger<QualityCheckController>.Instance));

    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckController(Mock.Of<IQualityCheckService>(), null!));
}
