using System.Text.Json.Nodes;
using PreDraftReport.Console.QuickStart.Simulation;
using Xunit;

namespace PreDraftReport.Console.QuickStart.Tests;

/// <summary>
/// Ties the payload that ships with the sample to the published example, so that the console, the
/// simulator and the published contract can't drift apart.
/// </summary>
public sealed class ContractTests
{
    private const string TenantId = "11111111-1111-1111-1111-111111111111";
    private const string EnvironmentId = "22222222-2222-2222-2222-222222222222";

    private static string BundledPayload => File.ReadAllText(OutputPath("MockData/pre-draft-report-ingest-request.json"));

    [Fact]
    public void TheBundledPayloadIsThePublishedExample()
    {
        var bundled = JsonNode.Parse(BundledPayload);
        var published = JsonNode.Parse(File.ReadAllText(OutputPath("Contract/PreDraftReportGeneration-Ingest-Request-Example.json")));

        Assert.True(
            JsonNode.DeepEquals(bundled, published),
            "MockData/pre-draft-report-ingest-request.json must stay a copy of radiologists/partner-initiated/samples/PreDraftReportGeneration-Ingest-Request-Example.json.");
    }

    [Fact]
    public void TheBundledPayloadPassesTheSimulatorsValidation()
    {
        var validation = SimulatedRequestValidator.Validate(TenantId, EnvironmentId, BundledPayload);

        var errors = string.Join("; ", validation.Errors.Select(error => $"{error.Key}: {string.Join(" ", error.Value)}"));
        Assert.True(validation.IsValid, $"The bundled payload fails validation: {errors}");
    }

    private static string OutputPath(string relativePath) =>
        Path.Combine(AppContext.BaseDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));
}
