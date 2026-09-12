using Dragon.Copilot.Radiologists.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SampleExtension.Radiologists.Web.Quickstart.Services;
using Xunit;

namespace SampleExtension.Radiologists.Web.Quickstart.Tests;

public sealed class QualityCheckServiceTests : IDisposable
{
    private readonly string _contentRoot;

    public QualityCheckServiceTests()
    {
        _contentRoot = Path.Combine(Path.GetTempPath(), "rad-quickstart-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_contentRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_contentRoot))
        {
            Directory.Delete(_contentRoot, recursive: true);
        }
    }

    private QualityCheckService CreateService(string mockDataRelativePath)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["SampleExtension:MockDataFile"] = mockDataRelativePath })
            .Build();

        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.ContentRootPath).Returns(_contentRoot);

        return new QualityCheckService(configuration, env.Object, NullLogger<QualityCheckService>.Instance);
    }

    private string WriteMockFile(string relativePath, string json)
    {
        var fullPath = Path.Combine(_contentRoot, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        File.WriteAllText(fullPath, json);
        return relativePath;
    }

    [Fact]
    public async Task ProcessAsync_WithMockDataFile_ReturnsRecommendationsFromFile()
    {
        const string json = """
            {
              "success": true,
              "message": "Payload processed successfully.",
              "payload": {
                "qualityCheckResult": {
                  "recommendations": [
                    { "qualityCheckType": "Clinical", "description": "d", "reason": "r", "severityScorePercent": 80, "provenance": [{ "text": "t", "startPosition": 0, "endPosition": 1 }] }
                  ]
                }
              }
            }
            """;
        var service = CreateService(WriteMockFile("MockData/quality.json", json));

        var response = await service.ProcessAsync(new ProcessRequest { SessionData = new SessionData() });

        Assert.True(response.Success);
        Assert.Equal("Payload processed successfully.", response.Message);
        var recommendations = response.Payload!["qualityCheckResult"].Recommendations;
        Assert.Single(recommendations);
        Assert.Equal("d", recommendations[0].Description);
    }

    [Fact]
    public async Task ProcessAsync_WhenMockFileMissing_ReturnsEmptySuccess()
    {
        var service = CreateService("MockData/does-not-exist.json");

        var response = await service.ProcessAsync(new ProcessRequest { SessionData = new SessionData() });

        Assert.True(response.Success);
        Assert.Equal("No mock data configured.", response.Message);
    }

    [Fact]
    public async Task ProcessAsync_WithNullPayload_ThrowsArgumentNullException() =>
        await Assert.ThrowsAsync<ArgumentNullException>(
            () => CreateService("MockData/quality.json").ProcessAsync(null!));

    [Fact]
    public void Constructor_WithNullConfiguration_ThrowsArgumentNullException()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.ContentRootPath).Returns(_contentRoot);

        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(null!, env.Object, NullLogger<QualityCheckService>.Instance));
    }

    [Fact]
    public void Constructor_WithNullEnvironment_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(new ConfigurationBuilder().Build(), null!, NullLogger<QualityCheckService>.Instance));

    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException()
    {
        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.ContentRootPath).Returns(_contentRoot);

        Assert.Throws<ArgumentNullException>(
            () => new QualityCheckService(new ConfigurationBuilder().Build(), env.Object, null!));
    }

    [Fact]
    public async Task ProcessAsync_WhenMockFileDeserializesToNull_ReturnsEmptyData()
    {
        var service = CreateService(WriteMockFile("MockData/null.json", "null"));

        var response = await service.ProcessAsync(new ProcessRequest { SessionData = new SessionData() });

        Assert.True(response.Success);
        Assert.Equal("Mock data was empty.", response.Message);
    }

    [Fact]
    public async Task ProcessAsync_WhenPayloadHasNoQualityCheckResult_ReturnsEmptyPayload()
    {
        const string json = """
            { "success": true, "message": "m", "payload": { "other": { "recommendations": [] } } }
            """;
        var service = CreateService(WriteMockFile("MockData/other.json", json));

        var response = await service.ProcessAsync(new ProcessRequest { SessionData = new SessionData() });

        Assert.Empty(response.Payload!);
    }
}
