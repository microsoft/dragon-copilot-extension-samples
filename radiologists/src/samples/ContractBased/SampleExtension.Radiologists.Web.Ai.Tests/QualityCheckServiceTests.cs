using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SampleExtension.Radiologists.Web.Ai.Services;
using Xunit;

namespace SampleExtension.Radiologists.Web.Ai.Tests;

public sealed class QualityCheckServiceTests
{
    private static QualityCheckService CreateService(IAzureOpenAIService? provider = null) =>
        new(NullLogger<QualityCheckService>.Instance, provider ?? Mock.Of<IAzureOpenAIService>());

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void IsConfigured_DelegatesToProvider(bool configured)
    {
        var provider = new Mock<IAzureOpenAIService>();
        provider.SetupGet(p => p.IsConfigured).Returns(configured);

        Assert.Equal(configured, CreateService(provider.Object).IsConfigured);
    }

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
            () => new QualityCheckService(null!, Mock.Of<IAzureOpenAIService>()));

    [Fact]
    public void Constructor_WithNullProvider_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(NullLogger<QualityCheckService>.Instance, null!));
}
