using Azure;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using SampleExtension.Radiology.Web.Ai.Configuration;

namespace SampleExtension.Radiology.Web.Ai.Services;

/// <summary>
/// Azure OpenAI–backed chat completion provider. Reads <see cref="OpenAiSettings"/> and
/// builds a <see cref="ChatClient"/> for the configured deployment. The client is created
/// once and reused for the lifetime of the service.
/// </summary>
public sealed class AzureOpenAIService : IAzureOpenAIService
{
    private readonly OpenAiSettings _settings;
    private readonly Lazy<ChatClient> _chatClient;

    public AzureOpenAIService(IOptions<OpenAiSettings> options)
    {
        ArgumentNullException.ThrowIfNull(options);
        _settings = options.Value;
        _chatClient = new Lazy<ChatClient>(CreateChatClient);
    }

    /// <inheritdoc />
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_settings.Endpoint)
        && !string.IsNullOrWhiteSpace(_settings.ApiKey)
        && !string.IsNullOrWhiteSpace(_settings.DeploymentName);

    /// <inheritdoc />
    public ChatClient GetChatClient()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "Azure OpenAI is not configured. Endpoint, ApiKey, and DeploymentName must all be set.");
        }

        return _chatClient.Value;
    }

    private ChatClient CreateChatClient()
    {
        var endpoint = new Uri(_settings.Endpoint);
        var azureClient = new AzureOpenAIClient(endpoint, new AzureKeyCredential(_settings.ApiKey));
        return azureClient.GetChatClient(_settings.DeploymentName);
    }
}
