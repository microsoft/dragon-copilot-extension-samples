using Microsoft.Extensions.Options;
using SampleExtension.Radiologists.Web.Ai.Configuration;
using SampleExtension.Radiologists.Web.Ai.Services;
using Xunit;

namespace SampleExtension.Radiologists.Web.Ai.Tests;

public sealed class AzureOpenAIServiceTests
{
    private static AzureOpenAIService CreateService(string endpoint, string apiKey, string deploymentName) =>
        new(Options.Create(new OpenAiSettings
        {
            Endpoint = endpoint,
            ApiKey = apiKey,
            DeploymentName = deploymentName,
        }));

    [Theory]
    [InlineData("https://unit-test.openai.azure.com/", "key", "deployment", true)]
    [InlineData("", "key", "deployment", false)]
    [InlineData("https://unit-test.openai.azure.com/", "", "deployment", false)]
    [InlineData("https://unit-test.openai.azure.com/", "key", "", false)]
    [InlineData("   ", "key", "deployment", false)]
    public void IsConfigured_ReflectsSettings(string endpoint, string apiKey, string deploymentName, bool expected) =>
        Assert.Equal(expected, CreateService(endpoint, apiKey, deploymentName).IsConfigured);

    [Fact]
    public void GetChatClient_WhenNotConfigured_ThrowsInvalidOperationException() =>
        Assert.Throws<InvalidOperationException>(
            () => CreateService(string.Empty, string.Empty, string.Empty).GetChatClient());

    [Fact]
    public void GetChatClient_WhenConfigured_ReturnsClient()
    {
        var client = CreateService("https://unit-test.openai.azure.com/", "test-key", "test-deployment").GetChatClient();

        Assert.NotNull(client);
    }

    [Fact]
    public void Constructor_WithNullOptions_ThrowsArgumentNullException() =>
        Assert.Throws<ArgumentNullException>(() => new AzureOpenAIService(null!));
}
