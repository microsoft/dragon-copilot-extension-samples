using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using PreDraftReport.Console.QuickStart.Simulation;
using Xunit;

namespace PreDraftReport.Console.QuickStart.Tests;

/// <summary>
/// Covers each response the simulated endpoint returns, in the order Dragon Copilot checks a submission.
/// </summary>
public sealed class SimulatedDragonCopilotHandlerTests : IDisposable
{
    private const string TenantId = "11111111-1111-1111-1111-111111111111";
    private const string EnvironmentId = "22222222-2222-2222-2222-222222222222";
    private const string Route = $"api/v1/tenants/{TenantId}/environments/{EnvironmentId}/draft-report-ai-results";

    private const string Manifest = """
        name: sampleRadiologyExtension
        version: 0.0.1
        auth:
          tenantId: 00000000-0000-0000-0000-000000000000
        tools:
          - name: preDraftReportGeneratorTool
            toolType: partnerInitiated
            capability: preDraftReportGeneration
        """;

    private readonly string _directory = Directory.CreateTempSubdirectory("pre-draft-report-simulator").FullName;

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    [Fact]
    public async Task AValidSubmissionIsStoredWithAnEmptyBody()
    {
        using var client = CreateClient();

        using var response = await PostAsync(client, ValidBody());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ResubmittingAnIdentifierReturnsResultAlreadyStored()
    {
        using var client = CreateClient();
        using var first = await PostAsync(client, ValidBody());

        using var second = await PostAsync(client, ValidBody());

        await AssertErrorAsync(second, HttpStatusCode.Conflict, "Request could not be processed.", "ResultAlreadyStored");
    }

    [Fact]
    public async Task StoredResultsAreRememberedBetweenRuns()
    {
        using (var firstRun = CreateClient())
        using (var stored = await PostAsync(firstRun, ValidBody()))
        {
            Assert.Equal(HttpStatusCode.OK, stored.StatusCode);
        }

        using var secondRun = CreateClient();
        using var response = await PostAsync(secondRun, ValidBody());

        await AssertErrorAsync(response, HttpStatusCode.Conflict, "Request could not be processed.", "ResultAlreadyStored");
    }

    [Fact]
    public async Task AnUnknownAccessionNumberReturnsOrderNotFound()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["draftReport"]!["imagingStudy"]!["accessionNumber"] = "ACC-DOES-NOT-EXIST";

        using var response = await PostAsync(client, body);

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "OrderNotFound");
    }

    [Fact]
    public async Task AnAccessionNumberOnTwoOrdersReturnsMultipleOrdersMatched()
    {
        using var client = CreateClient(settings => settings.Orders.Add("ACC-0000001"));

        using var response = await PostAsync(client, ValidBody());

        await AssertErrorAsync(response, HttpStatusCode.Conflict, "Request could not be processed.", "MultipleOrdersMatched");
    }

    [Fact]
    public async Task AMissingManifestMeansTheExtensionIsNotInstalled()
    {
        using var client = CreateClient(settings => settings.Installations[0].ManifestPath = "missing.yaml");

        using var response = await PostAsync(client, ValidBody());

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "ExtensionNotFound");
    }

    [Fact]
    public async Task AnUnreadableManifestMeansTheExtensionIsNotInstalled()
    {
        await File.WriteAllTextAsync(Path.Combine(_directory, "broken.yaml"), "name: [unclosed");
        using var client = CreateClient(settings => settings.Installations[0].ManifestPath = "broken.yaml");

        using var response = await PostAsync(client, ValidBody());

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "ExtensionNotFound");
    }

    [Fact]
    public async Task AManifestNameThatDoesNotMatchReturnsExtensionNotFound()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["manifestName"] = "someOtherExtension";

        using var response = await PostAsync(client, body);

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "ExtensionNotFound");
    }

    [Fact]
    public async Task MarketplaceIdsNeverMatchAnExtensionUploadedAsACustomApp()
    {
        using var client = CreateClient();

        using var response = await PostAsync(client, WithMarketplaceIds(ValidBody()));

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "ExtensionNotFound");
    }

    [Fact]
    public async Task MarketplaceIdsMatchAnExtensionPurchasedWithThatOfferAndPlan()
    {
        using var client = CreateClient(PurchaseFromMarketplace);

        using var response = await PostAsync(client, WithMarketplaceIds(ValidBody()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task WithoutMarketplaceIdsAPurchasedExtensionIsMatchedByName()
    {
        using var client = CreateClient(PurchaseFromMarketplace);

        using var response = await PostAsync(client, ValidBody());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task TwoInstalledExtensionsWithTheSameNameReturnMultipleExtensionsMatched()
    {
        using var client = CreateClient(settings => settings.Installations.Add(new SimulatedInstallation { ManifestPath = "extension.yaml" }));

        using var response = await PostAsync(client, ValidBody());

        await AssertErrorAsync(response, HttpStatusCode.Conflict, "Request could not be processed.", "MultipleExtensionsMatched");
    }

    [Fact]
    public async Task AToolNameThatIsNotDeclaredReturnsToolNotFound()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["toolName"] = "toolThatIsNotInstalled";

        using var response = await PostAsync(client, body);

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "ToolNotFound");
    }

    [Fact]
    public async Task AContractBasedToolReturnsToolNotFound()
    {
        await File.WriteAllTextAsync(
            Path.Combine(_directory, "contract-based.yaml"),
            Manifest.Replace("partnerInitiated", "contractBased", StringComparison.Ordinal));
        using var client = CreateClient(settings => settings.Installations[0].ManifestPath = "contract-based.yaml");

        using var response = await PostAsync(client, ValidBody());

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "ToolNotFound");
    }

    [Fact]
    public async Task TheToolNameIsMatchedIgnoringCase()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["toolName"] = "preDraftReportGENERATORTool";

        using var response = await PostAsync(client, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AnUnknownEnvironmentReturnsEnvironmentNotFound()
    {
        using var client = CreateClient();

        using var response = await PostAsync(
            client,
            ValidBody(),
            route: $"api/v1/tenants/{TenantId}/environments/33333333-3333-3333-3333-333333333333/draft-report-ai-results");

        await AssertErrorAsync(response, HttpStatusCode.NotFound, "Resource not found.", "EnvironmentNotFound");
    }

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public async Task ARouteIdThatIsNotANonEmptyGuidReturnsBadRequest(string tenantId)
    {
        using var client = CreateClient();

        using var response = await PostAsync(
            client,
            ValidBody(),
            route: $"api/v1/tenants/{tenantId}/environments/{EnvironmentId}/draft-report-ai-results");

        var errors = await AssertValidationProblemAsync(response);
        Assert.Equal(["tenantId must be a valid non-empty GUID."], errors["tenantId"]);
    }

    [Fact]
    public async Task AMissingRequiredFieldIsReportedByItsPropertyPath()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["draftReport"]!["imagingStudy"]!.AsObject().Remove("accessionNumber");

        using var response = await PostAsync(client, body);

        var errors = await AssertValidationProblemAsync(response);
        Assert.Equal(["The AccessionNumber field is required."], errors["DraftReport.ImagingStudy.AccessionNumber"]);
    }

    [Fact]
    public async Task APartialSetOfMarketplaceIdsReturnsBadRequest()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["publisherId"] = "101";

        using var response = await PostAsync(client, body);

        var errors = await AssertValidationProblemAsync(response);
        Assert.Equal(
            ["PublisherId, OfferId and PlanId must be supplied together or omitted together."],
            errors["MarketplaceExtensionIdentifiers"]);
    }

    [Fact]
    public async Task ANameThatIsNotCamelCaseReturnsBadRequest()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["manifestName"] = "Sample-Extension";

        using var response = await PostAsync(client, body);

        var errors = await AssertValidationProblemAsync(response);
        Assert.Equal(["The ManifestName must be camelCase and contain only letters and digits."], errors["ManifestName"]);
    }

    [Fact]
    public async Task SectionRulesAreReportedTogether()
    {
        using var client = CreateClient();
        var body = ValidBody();
        var section = body["draftReport"]!["reportContent"]!["structuredReport"]!["sections"]![0]!;
        section["name"] = "Impression";
        section["aiConfidence"] = 1.5;
        section["sectionOrder"] = 0;
        body["draftReport"]!["reportContent"]!["structuredReport"]!["format"] = "html";

        using var response = await PostAsync(client, body);

        var errors = await AssertValidationProblemAsync(response);
        const string Key = "DraftReport.ReportContent.StructuredReport";
        Assert.Equal(["The Format field does not equal any of the values specified in AllowedValuesAttribute."], errors[$"{Key}.Format"]);
        Assert.Equal(["The field Name must match the regular expression '^[a-z][a-z_]*$'."], errors[$"{Key}.Sections[0].Name"]);
        Assert.Equal(["The field AiConfidence must be between 0 and 1."], errors[$"{Key}.Sections[0].AiConfidence"]);
        Assert.Equal(["The field SectionOrder must be between 1 and 2147483647."], errors[$"{Key}.Sections[0].SectionOrder"]);
    }

    [Fact]
    public async Task AValueOfTheWrongTypeIsReportedByItsJsonPath()
    {
        using var client = CreateClient();
        var body = ValidBody();
        body["draftReport"]!["reportContent"]!["structuredReport"]!["sections"]![0]!["aiGenerated"] = "yes";

        using var response = await PostAsync(client, body);

        var errors = await AssertValidationProblemAsync(response);
        Assert.True(errors.ContainsKey("$.draftReport.reportContent.structuredReport.sections[0].aiGenerated"));
        Assert.Equal(["The draftReportRequestDto field is required."], errors["draftReportRequestDto"]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("{ not json")]
    public async Task ABodyThatCannotBeReadReturnsBadRequest(string body)
    {
        using var client = CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(Route, UriKind.Relative))
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };

        using var response = await client.SendAsync(request);

        var errors = await AssertValidationProblemAsync(response);
        Assert.Equal(["The draftReportRequestDto field is required."], errors["draftReportRequestDto"]);
    }

    [Fact]
    public async Task WhenATokenIsRequiredARequestWithoutOneReturnsUnauthorized()
    {
        using var client = CreateClient(requireAccessToken: true);

        using var response = await PostAsync(client, ValidBody());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("Bearer", Assert.Single(response.Headers.WwwAuthenticate).Scheme);
    }

    [Fact]
    public async Task WhenATokenIsRequiredAnyBearerTokenIsAccepted()
    {
        using var client = CreateClient(requireAccessToken: true);
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "any-token");

        using var response = await PostAsync(client, ValidBody());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AnUnknownPathReturnsNotFoundWithoutAReason()
    {
        using var client = CreateClient();

        using var response = await PostAsync(client, ValidBody(), route: "api/v1/draft-report-ai-results");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task AMethodOtherThanPostReturnsMethodNotAllowed()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync(new Uri(Route, UriKind.Relative));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.Contains("POST", response.Content.Headers.Allow);
    }

    [Fact]
    public async Task ABodyThatIsNotJsonReturnsUnsupportedMediaType()
    {
        using var client = CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(Route, UriKind.Relative))
        {
            Content = new StringContent(ValidBody().ToJsonString(), Encoding.UTF8, "text/plain"),
        };

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task TheCorrelationIdIsEchoed()
    {
        using var client = CreateClient();

        using var response = await PostAsync(client, ValidBody(), correlationId: "my-correlation-id");

        Assert.Equal("my-correlation-id", Assert.Single(response.Headers.GetValues("x-ms-correlation-id")));
    }

    [Fact]
    public async Task AnUnusableCorrelationIdIsReplacedWithAGeneratedOne()
    {
        using var client = CreateClient();

        using var response = await PostAsync(client, ValidBody(), correlationId: "has,a,comma");

        var correlationId = Assert.Single(response.Headers.GetValues("x-ms-correlation-id"));
        Assert.Matches("^[0-9a-f]{32}$", correlationId);
    }

    private static void PurchaseFromMarketplace(SimulationSettings settings)
    {
        settings.Installations[0].PublisherId = "101";
        settings.Installations[0].OfferId = "202";
        settings.Installations[0].PlanId = "303";
    }

    private static JsonObject WithMarketplaceIds(JsonObject body)
    {
        body["publisherId"] = "101";
        body["offerId"] = "202";
        body["planId"] = "303";
        return body;
    }

    private static JsonObject ValidBody() => JsonNode.Parse("""
        {
          "manifestName": "sampleRadiologyExtension",
          "toolName": "preDraftReportGeneratorTool",
          "draftReport": {
            "identifier": "a25c4954-a7f7-49f0-a4a2-98d354d60705",
            "aiSystemInfo": { "version": "1.2.0" },
            "imagingStudy": {
              "studyUid": "2.25.329391862910276348519548604004805820309",
              "accessionNumber": "ACC-0000001"
            },
            "reportContent": {
              "format": "structured_report",
              "structuredReport": {
                "format": "plain_text",
                "sections": [
                  { "name": "impression", "content": "No acute cardiopulmonary abnormality.", "aiGenerated": true, "aiConfidence": 1, "sectionOrder": 1 }
                ]
              }
            }
          }
        }
        """)!.AsObject();

    private static async Task<HttpResponseMessage> PostAsync(
        HttpClient client,
        JsonObject body,
        string route = Route,
        string? correlationId = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(route, UriKind.Relative))
        {
            Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json"),
        };

        if (correlationId is not null)
        {
            request.Headers.Add("x-ms-correlation-id", correlationId);
        }

        return await client.SendAsync(request);
    }

    private static async Task AssertErrorAsync(HttpResponseMessage response, HttpStatusCode status, string message, string reason)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(message, document.RootElement.GetProperty("message").GetString());
        Assert.Equal(reason, document.RootElement.GetProperty("reason").GetString());
    }

    private static async Task<Dictionary<string, string[]>> AssertValidationProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.Equal("One or more validation errors occurred.", root.GetProperty("title").GetString());
        Assert.Equal(400, root.GetProperty("status").GetInt32());
        Assert.True(root.TryGetProperty("traceId", out _));
        return root.GetProperty("errors").Deserialize<Dictionary<string, string[]>>()!;
    }

    [SuppressMessage("Reliability", "CA2000:Dispose objects before losing scope", Justification = "The HttpClient disposes the handler.")]
    private HttpClient CreateClient(Action<SimulationSettings>? configure = null, bool requireAccessToken = false)
    {
        var manifestPath = Path.Combine(_directory, "extension.yaml");
        if (!File.Exists(manifestPath))
        {
            File.WriteAllText(manifestPath, Manifest);
        }

        var settings = new SimulationSettings
        {
            CustomerTenantId = TenantId,
            EnvironmentId = EnvironmentId,
            StoredResultsPath = Path.Combine(_directory, "stored-results.txt"),
        };
        settings.Installations.Add(new SimulatedInstallation { ManifestPath = "extension.yaml" });
        settings.Orders.Add("ACC-0000001");
        configure?.Invoke(settings);

        var handler = new SimulatedDragonCopilotHandler(SimulatedEnvironment.Load(settings, _directory), requireAccessToken);
        return new HttpClient(handler) { BaseAddress = SimulatedDragonCopilotHandler.BaseAddress };
    }
}
