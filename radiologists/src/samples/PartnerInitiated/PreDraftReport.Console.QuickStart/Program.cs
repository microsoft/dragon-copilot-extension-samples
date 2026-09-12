using System.Text.Json;
using System.Text.Json.Serialization;
using Dragon.Copilot.Radiologists.Models;
using PreDraftReport.Console.QuickStart.Services;

namespace PreDraftReport.Console.QuickStart;

// The enclosing namespace is named Console, so System.Console needs an alias to stay reachable.
using Console = System.Console;

/// <summary>
/// Checks a pre-draft report submission and prints the JSON body that would be posted.
/// </summary>
public static class Program
{
    private const string DefaultPayloadPath = "MockData/pre-draft-report-ingest-request.json";

    private static readonly JsonSerializerOptions PrintOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true,
    };

    /// <summary>
    /// Runs the sample.
    /// </summary>
    /// <param name="args">Optional path to a payload file.</param>
    /// <returns>Zero when the payload is valid, one otherwise.</returns>
    public static int Main(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        var payloadPath = args.Length > 0 ? args[0] : DefaultPayloadPath;

        if (!TryLoadRequest(payloadPath, out var request))
        {
            return 1;
        }

        var problems = RequestValidator.Validate(request);
        if (problems.Count > 0)
        {
            Console.WriteLine($"{payloadPath} is not valid ({problems.Count} problem(s)):");
            foreach (var problem in problems)
            {
                Console.WriteLine($"  - {problem}");
            }

            return 1;
        }

        Console.WriteLine($"{payloadPath} is structurally valid.");
        Console.WriteLine();
        Console.WriteLine("Post this body to");
        Console.WriteLine("  POST api/v1/tenants/{tenantId}/environments/{environmentId}/draft-report-ai-results");
        Console.WriteLine();
        Console.WriteLine(JsonSerializer.Serialize(request, PrintOptions));
        return 0;
    }

    private static bool TryLoadRequest(string payloadPath, out PreDraftReportIngestRequest request)
    {
        request = null!;

        if (!File.Exists(payloadPath))
        {
            Console.WriteLine($"Payload not found: {payloadPath}");
            return false;
        }

        try
        {
            request = JsonSerializer.Deserialize<PreDraftReportIngestRequest>(File.ReadAllText(payloadPath))!;
        }
        catch (JsonException ex)
        {
            Console.WriteLine($"Payload is not valid JSON: {ex.Message}");
            return false;
        }

        if (request is null)
        {
            Console.WriteLine($"Payload is empty: {payloadPath}");
            return false;
        }

        return true;
    }
}
