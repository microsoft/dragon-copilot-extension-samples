using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Dragon.Copilot.Radiologists.Models;

namespace PreDraftReport.Console.QuickStart.Submission;

/// <summary>
/// Posts a pre-draft report to Dragon Copilot's submission endpoint and reads the response.
/// </summary>
public sealed class DraftReportClient
{
    /// <summary>
    /// The request and response header that carries the correlation ID.
    /// </summary>
    public const string CorrelationIdHeader = "x-ms-correlation-id";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="DraftReportClient"/> class.
    /// </summary>
    /// <param name="httpClient">An HTTP client whose base address is the Dragon Copilot API base URL.</param>
    public DraftReportClient(HttpClient httpClient)
    {
        ArgumentNullException.ThrowIfNull(httpClient);
        _httpClient = httpClient;
    }

    /// <summary>
    /// Submits a pre-draft report.
    /// </summary>
    /// <param name="customerTenantId">The customer's Microsoft Entra tenant ID.</param>
    /// <param name="environmentId">The ID of the customer environment the extension is installed in.</param>
    /// <param name="request">The request body.</param>
    /// <param name="accessToken">The access token, or null to send the request without one.</param>
    /// <param name="correlationId">An ID for this request, returned in the response and useful to support.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    /// <returns>What Dragon Copilot returned.</returns>
    public async Task<SubmissionResult> SubmitAsync(
        string customerTenantId,
        string environmentId,
        DraftReportIngestRequest request,
        string? accessToken,
        string correlationId,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(customerTenantId);
        ArgumentNullException.ThrowIfNull(environmentId);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(correlationId);

        var route = new Uri(
            $"api/v1/tenants/{Uri.EscapeDataString(customerTenantId)}/environments/{Uri.EscapeDataString(environmentId)}/draft-report-ai-results",
            UriKind.Relative);

        using var message = new HttpRequestMessage(HttpMethod.Post, route)
        {
            Content = JsonContent.Create(request, options: SerializerOptions),
        };

        if (accessToken is not null)
        {
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        }

        message.Headers.Add(CorrelationIdHeader, correlationId);

        using var response = await _httpClient.SendAsync(message, cancellationToken).ConfigureAwait(false);
        var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        var returnedCorrelationId = response.Headers.TryGetValues(CorrelationIdHeader, out var values)
            ? values.FirstOrDefault()
            : null;

        return new SubmissionResult(response.StatusCode, ReadReason(response, body), body, returnedCorrelationId);
    }

    private static string? ReadReason(HttpResponseMessage response, string body)
    {
        // 404 and 409 responses carry { "message", "reason" }. The message is the same for every
        // response with that status, so the reason is what tells the cases apart.
        if (response.Content.Headers.ContentType?.MediaType != "application/json" || body.Length == 0)
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.ValueKind == JsonValueKind.Object
                && document.RootElement.TryGetProperty("reason", out var reason)
                && reason.ValueKind == JsonValueKind.String
                    ? reason.GetString()
                    : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
