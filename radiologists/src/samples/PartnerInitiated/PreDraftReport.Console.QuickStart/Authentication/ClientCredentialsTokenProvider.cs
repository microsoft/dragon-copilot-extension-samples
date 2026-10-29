using Microsoft.Identity.Client;

namespace PreDraftReport.Console.QuickStart.Authentication;

/// <summary>
/// Acquires an app-only access token for the Partner Communications API with the OAuth 2.0 client
/// credentials flow and a client secret.
/// </summary>
/// <remarks>
/// A short-lived client secret is enough to try the sample, but it isn't an acceptable long-term
/// credential. In production, use a federated credential, or a certificate where federation isn't
/// available, as described in radiologists/partner-initiated/authentication.md.
/// </remarks>
public sealed class ClientCredentialsTokenProvider : ITokenProvider
{
    /// <summary>
    /// The scope for the Partner Communications API.
    /// </summary>
    public const string Scope = "7c2215ec-e1fa-4aa6-9204-8ee91e63d29f/.default";

    private readonly IConfidentialClientApplication _application;

    /// <summary>
    /// Initializes a new instance of the <see cref="ClientCredentialsTokenProvider"/> class.
    /// </summary>
    /// <param name="tenantId">The Partner tenant ID.</param>
    /// <param name="clientId">The Partner app registration's application (client) ID.</param>
    /// <param name="clientSecret">The Partner app registration's client secret.</param>
    public ClientCredentialsTokenProvider(string tenantId, string clientId, string clientSecret)
    {
        _application = ConfidentialClientApplicationBuilder
            .Create(clientId)
            .WithAuthority(new Uri($"https://login.microsoftonline.com/{tenantId}"))
            .WithClientSecret(clientSecret)
            .Build();
    }

    /// <inheritdoc/>
    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        // MSAL caches the token, so reuse one instance rather than creating one per submission.
        var result = await _application
            .AcquireTokenForClient([Scope])
            .ExecuteAsync(cancellationToken)
            .ConfigureAwait(false);

        return result.AccessToken;
    }
}
