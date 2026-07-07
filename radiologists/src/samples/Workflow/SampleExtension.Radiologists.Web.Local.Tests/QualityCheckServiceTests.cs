using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using SampleExtension.Radiologists.Web.Local.Configuration;
using SampleExtension.Radiologists.Web.Local.Services;
using Xunit;

namespace SampleExtension.Radiologists.Web.Local.Tests;

public sealed class QualityCheckServiceTests
{
    private static QualityCheckService CreateService() =>
        new(
            NullLogger<QualityCheckService>.Instance,
            Mock.Of<IFoundryLocalService>(),
            Options.Create(new FoundryLocalSettings()));

    [Fact]
    public void MapToResult_WithValidJson_ReturnsSuccessWithRecommendations()
    {
        const string json = """
            { "qualityCheckResult": { "recommendations": [ { "qualityCheckType": "Clinical", "description": "d", "reason": "r", "severityScorePercent": 80 } ] } }
            """;

        var response = CreateService().MapToResult(json);

        Assert.True(response.Success);
        Assert.Equal("Payload processed successfully.", response.Message);
        Assert.Single(response.Payload!["qualityCheckResult"].Recommendations);
    }

    [Theory]
    [InlineData("```json\n{ \"qualityCheckResult\": { \"recommendations\": [] } }\n```")]
    [InlineData("```\n{ \"qualityCheckResult\": { \"recommendations\": [] } }\n```")]
    public void MapToResult_WithCodeFencedJson_StripsFenceAndParses(string json)
    {
        var response = CreateService().MapToResult(json);

        Assert.True(response.Success);
        Assert.Empty(response.Payload!["qualityCheckResult"].Recommendations);
    }

    [Theory]
    [InlineData("not json at all")]
    [InlineData("{ \"unexpected\": true }")]
    [InlineData("[]")]
    public void MapToResult_WithMalformedOrUnexpectedJson_ReturnsEmptyFailure(string json)
    {
        var response = CreateService().MapToResult(json);

        Assert.False(response.Success);
        Assert.Equal("Model returned malformed output; returning empty recommendations.", response.Message);
        Assert.Empty(response.Payload!["qualityCheckResult"].Recommendations);
    }

    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(null!, Mock.Of<IFoundryLocalService>(), Options.Create(new FoundryLocalSettings())));

    [Fact]
    public void Constructor_WithNullFoundryLocalService_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(NullLogger<QualityCheckService>.Instance, null!, Options.Create(new FoundryLocalSettings())));

    [Fact]
    public void Constructor_WithNullOptions_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(NullLogger<QualityCheckService>.Instance, Mock.Of<IFoundryLocalService>(), null!));
}
