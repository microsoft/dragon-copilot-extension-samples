using OpenAI.Chat;

namespace SampleExtension.Radiology.Web.Ai.Services;

/// <summary>
/// Provides a chat client backed by an Azure OpenAI deployment when configured.
/// </summary>
public interface IAzureOpenAIService
{
    /// <summary>
    /// True when Endpoint, ApiKey, and DeploymentName are all set in configuration.
    /// </summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Returns the chat client for the configured Azure OpenAI deployment.
    /// Throws <see cref="InvalidOperationException"/> if <see cref="IsConfigured"/> is false.
    /// </summary>
    ChatClient GetChatClient();
}
