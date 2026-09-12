using OpenAI.Chat;

namespace SampleExtension.Radiologists.Web.Local.Services;

/// <summary>
/// Provides on-device chat completion via Microsoft.AI.Foundry.Local.
/// Implementations lazily download/load the configured model on first use, start a local
/// OpenAI-compatible web service, and return a <see cref="ChatClient"/> that targets it.
/// </summary>
public interface IFoundryLocalService
{
    /// <summary>
    /// Returns a chat client backed by the local Foundry model. The first call performs
    /// model download (if not cached), model load, and starts the local web service;
    /// subsequent calls return the same already-initialized client.
    /// </summary>
    Task<ChatClient> GetChatClientAsync(CancellationToken cancellationToken = default);
}
