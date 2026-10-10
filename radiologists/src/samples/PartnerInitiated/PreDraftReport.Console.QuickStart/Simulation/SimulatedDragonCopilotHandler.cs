using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace PreDraftReport.Console.QuickStart.Simulation;

/// <summary>
/// Stands in for Dragon Copilot's draft report submission endpoint, so the sample runs without a
/// real environment. It checks a submission in the same order as Dragon Copilot and answers with
/// the same status codes, reasons and bodies.
/// </summary>
/// <remarks>
/// Authentication is simplified. When a token is required, any bearer token is accepted, whereas
/// Dragon Copilot also validates the token, its <c>AiFindingsWriters</c> permission and its tenant.
/// </remarks>
public sealed class SimulatedDragonCopilotHandler : HttpMessageHandler
{
    /// <summary>
    /// The request and response header that carries the correlation ID.
    /// </summary>
    public const string CorrelationIdHeader = "x-ms-correlation-id";

    private const int MaxCorrelationIdLength = 128;

    private readonly SimulatedEnvironment _environment;
    private readonly bool _requireAccessToken;

    /// <summary>
    /// Initializes a new instance of the <see cref="SimulatedDragonCopilotHandler"/> class.
    /// </summary>
    /// <param name="environment">The customer environment to simulate.</param>
    /// <param name="requireAccessToken">Whether a request must carry a bearer token.</param>
    public SimulatedDragonCopilotHandler(SimulatedEnvironment environment, bool requireAccessToken)
    {
        ArgumentNullException.ThrowIfNull(environment);
        _environment = environment;
        _requireAccessToken = requireAccessToken;
    }

    /// <summary>
    /// Gets the base address to give the HTTP client. The host is never contacted.
    /// </summary>
    public static Uri BaseAddress { get; } = new("https://dragon-copilot.simulated.invalid/");

    /// <inheritdoc/>
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var correlationId = ResolveCorrelationId(request);
        var response = await HandleAsync(request, cancellationToken).ConfigureAwait(false);
        response.Headers.TryAddWithoutValidation(CorrelationIdHeader, correlationId);
        response.RequestMessage = request;
        return response;
    }

    private static string ResolveCorrelationId(HttpRequestMessage request)
    {
        // Echo a usable correlation ID, otherwise generate one, so every response carries one.
        if (request.Headers.TryGetValues(CorrelationIdHeader, out var values))
        {
            var value = values.FirstOrDefault()?.Trim();
            if (!string.IsNullOrEmpty(value)
                && value.Length <= MaxCorrelationIdLength
                && value.All(character => character is >= '!' and <= '~' and not ('"' or ',' or ';' or '\\')))
            {
                return value;
            }
        }

        return Guid.NewGuid().ToString("N");
    }

    private static bool HasBearerToken(HttpRequestMessage request) =>
        request.Headers.Authorization is { } authorization
        && string.Equals(authorization.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase)
        && !string.IsNullOrWhiteSpace(authorization.Parameter);

    private static bool TryMatchRoute(Uri? uri, out string customerTenantId, out string environmentId)
    {
        customerTenantId = string.Empty;
        environmentId = string.Empty;
        if (uri is null)
        {
            return false;
        }

        // POST api/v1/tenants/{customerTenantId}/environments/{environmentId}/draft-report-ai-results
        var segments = uri.AbsolutePath.TrimEnd('/').Split('/');
        if (segments.Length != 8
            || segments[0].Length != 0
            || !IsSegment(segments[1], "api")
            || !IsSegment(segments[2], "v1")
            || !IsSegment(segments[3], "tenants")
            || !IsSegment(segments[5], "environments")
            || !IsSegment(segments[7], "draft-report-ai-results"))
        {
            return false;
        }

        customerTenantId = Uri.UnescapeDataString(segments[4]);
        environmentId = Uri.UnescapeDataString(segments[6]);
        return customerTenantId.Length > 0 && environmentId.Length > 0;
    }

    private static bool IsSegment(string segment, string expected) =>
        string.Equals(segment, expected, StringComparison.OrdinalIgnoreCase);

    private static bool IsJson(HttpContent? content) =>
        string.Equals(content?.Headers.ContentType?.MediaType, "application/json", StringComparison.OrdinalIgnoreCase);

    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue(out string? text) ? text : null;

    private static string? MarketplaceId(JsonObject submission, string name) =>
        Text(submission[name]) is { } value && !string.IsNullOrWhiteSpace(value) ? value.Trim() : null;

    private static HttpResponseMessage Unauthorized()
    {
        var response = new HttpResponseMessage(HttpStatusCode.Unauthorized);
        response.Headers.WwwAuthenticate.Add(new AuthenticationHeaderValue("Bearer"));
        return response;
    }

    private static HttpResponseMessage MethodNotAllowed()
    {
        var response = new HttpResponseMessage(HttpStatusCode.MethodNotAllowed);
        response.Content.Headers.Allow.Add("POST");
        return response;
    }

    private static HttpResponseMessage Error(HttpStatusCode status, string reason)
    {
        // Dragon Copilot uses one message per status, so the reason is what tells the cases apart.
        var message = status == HttpStatusCode.NotFound ? "Resource not found." : "Request could not be processed.";
        return Json(status, JsonSerializer.Serialize(new { message, reason }), new MediaTypeHeaderValue("application/json"));
    }

    private static HttpResponseMessage Problem(
        HttpStatusCode status,
        string type,
        string title,
        IReadOnlyDictionary<string, string[]>? errors)
    {
        var problem = new JsonObject
        {
            ["type"] = type,
            ["title"] = title,
            ["status"] = (int)status,
        };

        if (errors is not null)
        {
            problem["errors"] = JsonSerializer.SerializeToNode(errors);
        }

        problem["traceId"] = $"00-{Guid.NewGuid():N}-{Guid.NewGuid().ToString("N")[..16]}-00";
        return Json(status, problem.ToJsonString(), new MediaTypeHeaderValue("application/problem+json") { CharSet = "utf-8" });
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json, MediaTypeHeaderValue contentType)
    {
        var content = new StringContent(json, Encoding.UTF8);
        content.Headers.ContentType = contentType;
        return new HttpResponseMessage(status) { Content = content };
    }

    private async Task<HttpResponseMessage> HandleAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Authentication runs before routing, so a request without a token gets 401 even on an unknown path.
        if (_requireAccessToken && !HasBearerToken(request))
        {
            return Unauthorized();
        }

        if (!TryMatchRoute(request.RequestUri, out var customerTenantId, out var environmentId))
        {
            // No reason: the request never reached the submission endpoint.
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }

        if (request.Method != HttpMethod.Post)
        {
            return MethodNotAllowed();
        }

        if (!IsJson(request.Content))
        {
            return Problem(HttpStatusCode.UnsupportedMediaType, "https://tools.ietf.org/html/rfc9110#section-15.5.16", "Unsupported Media Type", errors: null);
        }

        var body = await request.Content!.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        var validation = SimulatedRequestValidator.Validate(customerTenantId, environmentId, body);
        if (!validation.IsValid)
        {
            return Problem(HttpStatusCode.BadRequest, "https://tools.ietf.org/html/rfc9110#section-15.5.1", "One or more validation errors occurred.", validation.Errors);
        }

        var submission = validation.Body!;
        var draftReport = submission["draftReport"]!;
        var identifier = Text(draftReport["identifier"])!;
        var accessionNumber = Text(draftReport["imagingStudy"]?["accessionNumber"])!;

        // Resolved in Dragon Copilot's order: environment, extension, tool, stored result, then order.
        if (!_environment.Matches(customerTenantId, environmentId))
        {
            return Error(HttpStatusCode.NotFound, "EnvironmentNotFound");
        }

        var extensions = _environment.FindExtensions(
            Text(submission["manifestName"])!.Trim(),
            MarketplaceId(submission, "publisherId"),
            MarketplaceId(submission, "offerId"),
            MarketplaceId(submission, "planId"));

        if (extensions.Count == 0)
        {
            return Error(HttpStatusCode.NotFound, "ExtensionNotFound");
        }

        if (extensions.Count > 1)
        {
            return Error(HttpStatusCode.Conflict, "MultipleExtensionsMatched");
        }

        if (!extensions[0].DeclaresPreDraftReportTool(Text(submission["toolName"])!.Trim()))
        {
            return Error(HttpStatusCode.NotFound, "ToolNotFound");
        }

        if (_environment.HasStoredResult(environmentId, identifier))
        {
            return Error(HttpStatusCode.Conflict, "ResultAlreadyStored");
        }

        var orders = _environment.CountOrders(accessionNumber);
        if (orders == 0)
        {
            return Error(HttpStatusCode.NotFound, "OrderNotFound");
        }

        if (orders > 1)
        {
            return Error(HttpStatusCode.Conflict, "MultipleOrdersMatched");
        }

        await _environment.StoreResultAsync(environmentId, identifier, cancellationToken).ConfigureAwait(false);
        return new HttpResponseMessage(HttpStatusCode.OK);
    }
}
