using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using PreDraftReport.Console.QuickStart.Authentication;
using Xunit;

namespace PreDraftReport.Console.QuickStart.Tests;

/// <summary>
/// Covers a run of the console against the simulated endpoint, including the settings, manifest and
/// payload that ship with the sample.
/// </summary>
public sealed class ProgramTests : IDisposable
{
    private readonly string _directory = Directory.CreateTempSubdirectory("pre-draft-report-console").FullName;
    private readonly StringWriter _output = new();

    private static string BundledPayload =>
        Path.Combine(AppContext.BaseDirectory, "MockData", "pre-draft-report-ingest-request.json");

    private string Output => _output.ToString();

    public void Dispose()
    {
        _output.Dispose();
        Directory.Delete(_directory, recursive: true);
    }

    [Fact]
    public async Task TheShippedSettingsStoreTheBundledPayload()
    {
        var exitCode = await RunAsync(ShippedSettings(), BundledPayload);

        Assert.Equal(0, exitCode);
        Assert.Contains("Installed:       sampleRadiologyExtension", Output, StringComparison.Ordinal);
        Assert.Contains("200 OK", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ASecondRunReportsTheResultAsAlreadyStoredAndSucceeds()
    {
        var settings = ShippedSettings();
        await RunAsync(settings, BundledPayload);

        var exitCode = await RunAsync(settings, BundledPayload);

        Assert.Equal(0, exitCode);
        Assert.Contains("409 Conflict, reason ResultAlreadyStored", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnUnknownAccessionNumberFailsWithAHint()
    {
        var bundled = await File.ReadAllTextAsync(BundledPayload);
        var payload = WritePayload(bundled.Replace("ACC-0000001", "ACC-DOES-NOT-EXIST", StringComparison.Ordinal));

        var exitCode = await RunAsync(ShippedSettings(), payload);

        Assert.Equal(1, exitCode);
        Assert.Contains("404 NotFound, reason OrderNotFound", Output, StringComparison.Ordinal);
        Assert.Contains("No order in the environment has the accession number", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AMissingManifestIsReportedAndTheSubmissionGetsExtensionNotFound()
    {
        var settings = ShippedSettings();
        settings.Simulation.Installations[0].ManifestPath = Path.Combine(_directory, "missing.yaml");

        var exitCode = await RunAsync(settings, BundledPayload);

        Assert.Equal(1, exitCode);
        Assert.Contains("Not installed:", Output, StringComparison.Ordinal);
        Assert.Contains("404 NotFound, reason ExtensionNotFound", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task WithATokenProviderTheTokenIsSentAndAccepted()
    {
        var exitCode = await RunAsync(ShippedSettings(), BundledPayload, new FakeTokenProvider());

        Assert.Equal(0, exitCode);
        Assert.Contains("Acquired an access token", Output, StringComparison.Ordinal);
        Assert.Contains("200 OK", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AMissingPayloadFails()
    {
        var exitCode = await RunAsync(ShippedSettings(), Path.Combine(_directory, "missing.json"));

        Assert.Equal(1, exitCode);
        Assert.Contains("Payload not found", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task APayloadThatIsNotJsonFails()
    {
        var exitCode = await RunAsync(ShippedSettings(), WritePayload("{ not json"));

        Assert.Equal(1, exitCode);
        Assert.Contains("Payload could not be read", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task APayloadMissingARequiredValueFailsInsteadOfSendingADefault()
    {
        // Without [JsonRequired], a missing aiGenerated would load as false and be submitted.
        var bundled = await File.ReadAllTextAsync(BundledPayload);
        var payload = WritePayload(bundled.Replace("\"aiGenerated\": true,", string.Empty, StringComparison.Ordinal));

        var exitCode = await RunAsync(ShippedSettings(), payload);

        Assert.Equal(1, exitCode);
        Assert.Contains("Payload could not be read", Output, StringComparison.Ordinal);
        Assert.Contains("'aiGenerated'", Output, StringComparison.Ordinal);
        Assert.DoesNotContain("Submitting", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task APayloadMissingTheSectionsFailsInsteadOfSendingAnEmptyList()
    {
        var payload = await BundledPayloadAsync();
        payload["draftReport"]!["reportContent"]!["structuredReport"]!.AsObject().Remove("sections");

        var exitCode = await RunAsync(ShippedSettings(), WritePayload(payload.ToJsonString()));

        Assert.Equal(1, exitCode);
        Assert.Contains("Payload could not be read", Output, StringComparison.Ordinal);
        Assert.Contains("'sections'", Output, StringComparison.Ordinal);
        Assert.Contains("Path: $.draftReport.reportContent.structuredReport", Output, StringComparison.Ordinal);
        Assert.DoesNotContain("Submitting", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task TheOutputLeavesOutTheAccessionNumbersAndTheIdentifier()
    {
        var settings = ShippedSettings();
        var payload = await BundledPayloadAsync();
        var accessionNumber = payload["draftReport"]!["imagingStudy"]!["accessionNumber"]!.GetValue<string>();
        var identifier = payload["draftReport"]!["identifier"]!.GetValue<string>();

        await RunAsync(settings, BundledPayload);
        var exitCode = await RunAsync(settings, BundledPayload);

        Assert.Equal(0, exitCode);
        Assert.Contains("Orders:          1", Output, StringComparison.Ordinal);
        Assert.Contains("200 OK", Output, StringComparison.Ordinal);
        Assert.Contains("409 Conflict, reason ResultAlreadyStored", Output, StringComparison.Ordinal);
        Assert.DoesNotContain(accessionNumber, Output, StringComparison.Ordinal);
        Assert.DoesNotContain(identifier, Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnErrorResponseIsReportedByItsFieldsRatherThanItsBody()
    {
        var bundled = await File.ReadAllTextAsync(BundledPayload);
        var payload = WritePayload(bundled.Replace("ACC-0000001", "ACC-DOES-NOT-EXIST", StringComparison.Ordinal));

        var exitCode = await RunAsync(ShippedSettings(), payload);

        Assert.Equal(1, exitCode);
        Assert.Contains("  Resource not found.", Output, StringComparison.Ordinal);
        Assert.DoesNotContain("ACC-DOES-NOT-EXIST", Output, StringComparison.Ordinal);
        Assert.DoesNotContain("\"message\"", Output, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AValidationErrorIsReportedByItsKeyAndMessage()
    {
        var payload = await BundledPayloadAsync();
        payload["draftReport"]!["reportContent"]!["structuredReport"]!["sections"]![0]!["aiConfidence"] = 2;

        var exitCode = await RunAsync(ShippedSettings(), WritePayload(payload.ToJsonString()));

        Assert.Equal(1, exitCode);
        Assert.Contains("400 BadRequest", Output, StringComparison.Ordinal);
        Assert.Contains(
            "  DraftReport.ReportContent.StructuredReport.Sections[0].AiConfidence: The field AiConfidence must be between 0 and 1.",
            Output,
            StringComparison.Ordinal);
        Assert.Contains("  traceId: ", Output, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Accession ACC-0000001 failed", "  The response body isn't JSON, so it isn't shown.")]
    [InlineData("[\"ACC-0000001\"]", "  The response body isn't a JSON error object, so it isn't shown.")]
    public void AnErrorResponseThatIsNotAJsonObjectIsNotPrinted(string body, string expected)
    {
        Program.WriteErrorDetails(body, _output);

        Assert.Equal(expected, Output.TrimEnd());
    }

    [Fact]
    public async Task MainThrowsWhenArgsIsNull()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => Program.Main(null!));
    }

    [Fact]
    public async Task CancellingWhileTheReportIsSubmittedExitsCleanly()
    {
        using var cancellation = new CancellationTokenSource();

        var exitCode = await Program.RunAsync(
            ShippedSettings(), BundledPayload, AppContext.BaseDirectory, _output, new CancellingTokenProvider(cancellation), cancellation.Token);

        Assert.Equal(1, exitCode);
        Assert.Contains("Submitting", Output, StringComparison.Ordinal);
        Assert.EndsWith("Cancelled.", Output.TrimEnd(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CancellingWhileThePayloadLoadsExitsCleanly()
    {
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        var exitCode = await Program.RunAsync(
            ShippedSettings(), BundledPayload, AppContext.BaseDirectory, _output, null, cancellation.Token);

        Assert.Equal(1, exitCode);
        Assert.Equal("Cancelled.", Output.Trim());
    }

    private SampleSettings ShippedSettings()
    {
        // The appsettings.json that ships with the sample, keeping stored results in this test's folder.
        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var settings = SampleSettings.Load(configuration);
        settings.Simulation.StoredResultsPath = Path.Combine(_directory, "stored-results.txt");
        return settings;
    }

    private string WritePayload(string json)
    {
        var path = Path.Combine(_directory, $"{Guid.NewGuid()}.json");
        File.WriteAllText(path, json);
        return path;
    }

    private static async Task<JsonNode> BundledPayloadAsync() =>
        JsonNode.Parse(await File.ReadAllTextAsync(BundledPayload))!;

    private Task<int> RunAsync(SampleSettings settings, string payloadPath, ITokenProvider? tokenProvider = null) =>
        Program.RunAsync(settings, payloadPath, AppContext.BaseDirectory, _output, tokenProvider, CancellationToken.None);

    private sealed class FakeTokenProvider : ITokenProvider
    {
        public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) => Task.FromResult("test-token");
    }

    /// <summary>
    /// Cancels the run while handing out the token, as Ctrl+C would, so the submit that follows sees a cancelled token.
    /// </summary>
    private sealed class CancellingTokenProvider(CancellationTokenSource cancellation) : ITokenProvider
    {
        public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
        {
            await cancellation.CancelAsync();
            return "test-token";
        }
    }
}
