using System.Net;
using System.Text.Json;
using Dragon.Copilot.Radiologists.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Identity.Client;
using PreDraftReport.Console.QuickStart.Authentication;
using PreDraftReport.Console.QuickStart.Simulation;
using PreDraftReport.Console.QuickStart.Submission;

namespace PreDraftReport.Console.QuickStart;

// The enclosing namespace is named Console, so System.Console needs an alias to stay reachable.
using Console = System.Console;

/// <summary>
/// Submits a pre-draft report the way a Partner's service does, to a simulated Dragon Copilot endpoint.
/// </summary>
public static class Program
{
    private const string DefaultPayloadFileName = "pre-draft-report-ingest-request.json";

    private static readonly Dictionary<string, string> ReasonHints = new(StringComparer.Ordinal)
    {
        ["EnvironmentNotFound"] = "customerTenantId and environmentId don't identify a customer environment.",
        ["ExtensionNotFound"] = "No installed extension has a manifest whose name equals manifestName. If you sent Marketplace IDs, the extension must also have been purchased with that offer and plan.",
        ["MultipleExtensionsMatched"] = "More than one installed extension has this manifest name. Send the Marketplace IDs of the one you mean.",
        ["ToolNotFound"] = "The manifest declares no partnerInitiated tool named toolName with the preDraftReportGeneration capability.",
        ["OrderNotFound"] = "No order in the environment has the accession number in draftReport.imagingStudy.accessionNumber.",
        ["MultipleOrdersMatched"] = "More than one order in the environment has the accession number in draftReport.imagingStudy.accessionNumber.",
    };

    // 404 and 409 responses carry message and reason; a 400 is a problem details object with title and errors.
    private static readonly string[] ErrorSummaryProperties = ["message", "title", "detail"];

    /// <summary>
    /// Runs the sample.
    /// </summary>
    /// <param name="args">Optional path to a payload file. Defaults to the bundled example.</param>
    /// <returns>Zero when the draft report is stored, or was already stored; one otherwise.</returns>
    public static async Task<int> Main(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddUserSecrets(typeof(Program).Assembly, optional: true)
            .AddEnvironmentVariables()
            .Build();

        var settings = SampleSettings.Load(configuration);

        ClientCredentialsTokenProvider? tokenProvider = null;
        if (settings.Authentication.Enabled)
        {
            var missing = MissingAuthenticationSettings(settings.Authentication);
            if (missing.Count > 0)
            {
                Console.WriteLine($"Authentication is enabled, but these settings are empty: {string.Join(", ", missing)}.");
                return 1;
            }

            tokenProvider = new ClientCredentialsTokenProvider(
                settings.Authentication.TenantId,
                settings.Authentication.ClientId,
                settings.Authentication.ClientSecret);
        }

        var payloadPath = args.Length > 0
            ? Path.GetFullPath(args[0])
            : Path.Combine(AppContext.BaseDirectory, "MockData", DefaultPayloadFileName);

        using var cancellation = new CancellationTokenSource();
        Console.CancelKeyPress += (_, eventArgs) =>
        {
            eventArgs.Cancel = true;
            cancellation.Cancel();
        };

        return await RunAsync(settings, payloadPath, AppContext.BaseDirectory, Console.Out, tokenProvider, cancellation.Token)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Loads a payload, acquires a token when one is supplied, submits the payload to the simulated
    /// endpoint and reports what came back.
    /// </summary>
    /// <param name="settings">The sample's settings.</param>
    /// <param name="payloadPath">The payload file to submit.</param>
    /// <param name="baseDirectory">The folder that relative paths in the settings are relative to.</param>
    /// <param name="output">Where to write progress and results.</param>
    /// <param name="tokenProvider">Supplies the access token, or null to submit without one.</param>
    /// <param name="cancellationToken">Cancels the run.</param>
    /// <returns>Zero when the draft report is stored, or was already stored; one otherwise, including when the run is cancelled.</returns>
    public static async Task<int> RunAsync(
        SampleSettings settings,
        string payloadPath,
        string baseDirectory,
        TextWriter output,
        ITokenProvider? tokenProvider,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(settings);
        ArgumentNullException.ThrowIfNull(output);

        try
        {
            return await RunStepsAsync(settings, payloadPath, baseDirectory, output, tokenProvider, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Ctrl+C cancels whichever step is running: loading the payload, acquiring the token or submitting.
            await output.WriteLineAsync("Cancelled.").ConfigureAwait(false);
            return 1;
        }
    }

    private static async Task<int> RunStepsAsync(
        SampleSettings settings,
        string payloadPath,
        string baseDirectory,
        TextWriter output,
        ITokenProvider? tokenProvider,
        CancellationToken cancellationToken)
    {
        // 1. Load the request. A Partner's service builds it from its model's output instead.
        var request = await LoadRequestAsync(payloadPath, output, cancellationToken).ConfigureAwait(false);
        if (request is null)
        {
            return 1;
        }

        // 2. Acquire an access token, when authentication is on.
        string? accessToken = null;
        if (tokenProvider is not null)
        {
            try
            {
                accessToken = await tokenProvider.GetAccessTokenAsync(cancellationToken).ConfigureAwait(false);
                await output.WriteLineAsync("Acquired an access token for the Partner Communications API.").ConfigureAwait(false);
            }
            catch (MsalException ex)
            {
                await output.WriteLineAsync($"Could not acquire an access token. {ex.ErrorCode}: {ex.Message}").ConfigureAwait(false);
                return 1;
            }
        }

        // 3. Send requests to the simulated endpoint instead of a real Dragon Copilot environment.
        var environment = SimulatedEnvironment.Load(settings.Simulation, baseDirectory);
        DescribeEnvironment(environment, output);

        using var handler = new SimulatedDragonCopilotHandler(environment, requireAccessToken: tokenProvider is not null);
        using var httpClient = new HttpClient(handler, disposeHandler: false)
        {
            BaseAddress = SimulatedDragonCopilotHandler.BaseAddress,
            Timeout = TimeSpan.FromSeconds(Math.Max(1, settings.DragonCopilot.TimeoutSeconds)),
        };

        // 4. Submit the draft report and report the outcome.
        var correlationId = Guid.NewGuid().ToString();
        await output.WriteLineAsync($"Submitting {payloadPath}").ConfigureAwait(false);
        await output.WriteLineAsync(
            $"  POST /api/v1/tenants/{settings.DragonCopilot.CustomerTenantId}/environments/{settings.DragonCopilot.EnvironmentId}/draft-report-ai-results")
            .ConfigureAwait(false);
        await output.WriteLineAsync($"  {DraftReportClient.CorrelationIdHeader}: {correlationId}").ConfigureAwait(false);

        SubmissionResult result;
        try
        {
            result = await new DraftReportClient(httpClient)
                .SubmitAsync(
                    settings.DragonCopilot.CustomerTenantId,
                    settings.DragonCopilot.EnvironmentId,
                    request,
                    accessToken,
                    correlationId,
                    cancellationToken)
                .ConfigureAwait(false);
        }
        catch (HttpRequestException ex)
        {
            await output.WriteLineAsync($"The request failed: {ex.Message}").ConfigureAwait(false);
            return 1;
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            await output.WriteLineAsync($"No response within {httpClient.Timeout.TotalSeconds} seconds.").ConfigureAwait(false);
            return 1;
        }

        return Report(result, output);
    }

    private static List<string> MissingAuthenticationSettings(AuthenticationSettings authentication)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(authentication.TenantId))
        {
            missing.Add("Authentication:TenantId");
        }

        if (string.IsNullOrWhiteSpace(authentication.ClientId))
        {
            missing.Add("Authentication:ClientId");
        }

        if (string.IsNullOrWhiteSpace(authentication.ClientSecret))
        {
            missing.Add("Authentication:ClientSecret");
        }

        return missing;
    }

    private static async Task<DraftReportIngestRequest?> LoadRequestAsync(string payloadPath, TextWriter output, CancellationToken cancellationToken)
    {
        if (!File.Exists(payloadPath))
        {
            await output.WriteLineAsync($"Payload not found: {payloadPath}").ConfigureAwait(false);
            return null;
        }

        try
        {
            var json = await File.ReadAllTextAsync(payloadPath, cancellationToken).ConfigureAwait(false);
            var request = JsonSerializer.Deserialize<DraftReportIngestRequest>(json);
            if (request is null)
            {
                await output.WriteLineAsync($"Payload is empty: {payloadPath}").ConfigureAwait(false);
            }

            return request;
        }
        catch (JsonException ex)
        {
            // Also raised when a required property, such as aiGenerated or sections, is missing. That
            // message names the property but not where it is.
            var message = ex.Path is not null && !ex.Message.Contains(ex.Path, StringComparison.Ordinal)
                ? $"{ex.Message} Path: {ex.Path}."
                : ex.Message;
            await output.WriteLineAsync($"Payload could not be read: {message}").ConfigureAwait(false);
            return null;
        }
    }

    private static void DescribeEnvironment(SimulatedEnvironment environment, TextWriter output)
    {
        output.WriteLine("Simulated Dragon Copilot environment");
        output.WriteLine($"  Customer tenant: {environment.CustomerTenantId}");
        output.WriteLine($"  Environment:     {environment.EnvironmentId}");

        if (environment.Installations.Count == 0)
        {
            output.WriteLine("  Installed:       nothing");
        }

        foreach (var installation in environment.Installations)
        {
            var source = installation.PublisherId is null
                ? "custom app"
                : $"Marketplace offer {installation.PublisherId}/{installation.OfferId}/{installation.PlanId}";

            output.WriteLine(installation.Problem is null
                ? $"  Installed:       {installation.ManifestName} ({source}) from {installation.ManifestPath}"
                : $"  Not installed:   the manifest {installation.ManifestPath} {installation.Problem}");
        }

        // Accession numbers identify a patient's study, so only their count is printed.
        output.WriteLine($"  Orders:          {environment.Orders.Count}");
        output.WriteLine($"  Stored results:  {environment.StoredResultsPath}");
        output.WriteLine();
    }

    /// <summary>
    /// Prints the documented fields of an error response rather than its raw body, so that whatever
    /// else a response carries doesn't end up in a log.
    /// </summary>
    /// <param name="body">The response body.</param>
    /// <param name="output">Where to write the fields.</param>
    internal static void WriteErrorDetails(string body, TextWriter output)
    {
        if (body.Length == 0)
        {
            return;
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var error = document.RootElement;
            if (error.ValueKind != JsonValueKind.Object)
            {
                output.WriteLine("  The response body isn't a JSON error object, so it isn't shown.");
                return;
            }

            foreach (var name in ErrorSummaryProperties)
            {
                if (error.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
                {
                    output.WriteLine($"  {value.GetString()}");
                }
            }

            if (error.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in errors.EnumerateObject().Where(property => property.Value.ValueKind == JsonValueKind.Array))
                {
                    var messages = property.Value.EnumerateArray()
                        .Where(message => message.ValueKind == JsonValueKind.String)
                        .Select(message => message.GetString());
                    output.WriteLine($"  {property.Name}: {string.Join(" ", messages)}");
                }
            }

            if (error.TryGetProperty("traceId", out var traceId) && traceId.ValueKind == JsonValueKind.String)
            {
                output.WriteLine($"  traceId: {traceId.GetString()}");
            }
        }
        catch (JsonException)
        {
            output.WriteLine("  The response body isn't JSON, so it isn't shown.");
        }
    }

    private static int Report(SubmissionResult result, TextWriter output)
    {
        output.WriteLine();
        output.WriteLine(result.Reason is null
            ? $"{(int)result.StatusCode} {result.StatusCode}"
            : $"{(int)result.StatusCode} {result.StatusCode}, reason {result.Reason}");
        output.WriteLine($"  {DraftReportClient.CorrelationIdHeader}: {result.CorrelationId}");

        if (result.StatusCode == HttpStatusCode.OK)
        {
            output.WriteLine(
                "  Stored. Dragon Copilot shows the draft when the radiologist opens the order whose accession number is in draftReport.imagingStudy.accessionNumber.");
            return 0;
        }

        if (result.Reason == "ResultAlreadyStored")
        {
            // Resending the same identifier never stores the draft twice, which is what makes a retry safe.
            output.WriteLine(
                "  A result with this draftReport.identifier is already stored, so nothing was stored again. " +
                "If this was a retry, there's nothing more to do. To replace the draft, submit it with a new identifier.");
            return 0;
        }

        WriteErrorDetails(result.Body, output);

        if (result.Reason is not null && ReasonHints.TryGetValue(result.Reason, out var hint))
        {
            output.WriteLine($"  {hint}");
        }
        else if (result.StatusCode == HttpStatusCode.Unauthorized)
        {
            output.WriteLine("  The access token is missing or invalid. See radiologists/partner-initiated/authentication.md.");
        }

        return 1;
    }
}
