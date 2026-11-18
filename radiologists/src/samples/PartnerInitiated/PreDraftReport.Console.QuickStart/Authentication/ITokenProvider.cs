namespace PreDraftReport.Console.QuickStart.Authentication;

/// <summary>
/// Supplies the access token sent with a submission.
/// </summary>
/// <remarks>
/// Replace the implementation to change how the token is acquired, for example with a certificate
/// or a federated credential, without touching the submission code.
/// </remarks>
public interface ITokenProvider
{
    /// <summary>
    /// Acquires an access token for the Partner Communications API.
    /// </summary>
    /// <param name="cancellationToken">Cancels the request.</param>
    /// <returns>The access token.</returns>
    Task<string> GetAccessTokenAsync(CancellationToken cancellationToken);
}
