// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;
using SampleConversational.OpenApi.Web.Services;

namespace SampleConversational.OpenApi.Web.Tests;

public class DrugInteractionTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Theory]
    [InlineData("warfarin", "aspirin", "major")]
    [InlineData("Aspirin", " Warfarin ", "major")]
    [InlineData("metformin", "lisinopril", "none")]
    [InlineData("water", "salt", "unknown")]
    public void Check_ReturnsSeverity(string a, string b, string severity)
    {
        Assert.Equal(severity, DrugInteractions.Check(new DrugInteractionRequest(a, b)).Severity);
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync(new Uri("/health", UriKind.Relative));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OpenApiDocument_ExposesOperationAndServer()
    {
        using var client = factory.CreateClient();
        var document = JsonNode.Parse(await client.GetStringAsync(new Uri("/openapi/v1.json", UriKind.Relative)))!;

        Assert.StartsWith("3.0", document["openapi"]!.GetValue<string>(), StringComparison.Ordinal);
        Assert.Equal("checkDrugInteraction", document["paths"]!["/interactions/check"]!["post"]!["operationId"]!.GetValue<string>());
        Assert.NotEmpty(document["servers"]!.AsArray());
        Assert.Null(document["paths"]!["/health"]);
    }

    [Fact]
    public async Task CheckEndpoint_ReturnsExtractableFieldsAndEchoesCorrelationHeader()
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/interactions/check", UriKind.Relative))
        {
            Content = JsonContent.Create(new { medicationA = "warfarin", medicationB = "aspirin", locale = "en-US" }),
        };
        request.Headers.Add("x-correlation-id", "corr-1");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;

        Assert.Contains("bleeding", body["summary"]!.GetValue<string>(), StringComparison.Ordinal);
        Assert.NotEmpty(body["sources"]!.AsArray().Select(s => s!["url"]!.GetValue<string>()));
        Assert.Equal("corr-1", body["correlationId"]!.GetValue<string>());
        Assert.Empty(body["patientContextFields"]!.AsArray());
    }

    [Fact]
    public async Task OpenApiDocument_DeclaresPlatformBoundFieldsAsOptional()
    {
        using var client = factory.CreateClient();
        var document = JsonNode.Parse(await client.GetStringAsync(new Uri("/openapi/v1.json", UriKind.Relative)))!;
        var schema = document["components"]!["schemas"]!["DrugInteractionRequest"]!;
        var properties = schema["properties"]!.AsObject();
        var required = schema["required"]?.AsArray().Select(r => r!.GetValue<string>()).ToList() ?? [];

        Assert.True(properties.ContainsKey("medicationA"));
        Assert.True(properties.ContainsKey("patientContext"));
        Assert.True(properties.ContainsKey("locale"));
        Assert.DoesNotContain("patientContext", required);
        Assert.DoesNotContain("locale", required);
    }

    [Fact]
    public async Task OpenApiDocument_ServersHonorForwardedHeaders()
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/openapi/v1.json", UriKind.Relative));
        request.Headers.Add("X-Forwarded-Proto", "https");
        request.Headers.Add("X-Forwarded-Host", "api.contoso.example");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var document = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;

        Assert.Equal("https://api.contoso.example", document["servers"]![0]!["url"]!.GetValue<string>());
    }

    [Fact]
    public async Task CheckEndpoint_AcceptsOptionalPatientContextBody()
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            new Uri("/interactions/check", UriKind.Relative),
            new
            {
                medicationA = "warfarin",
                medicationB = "aspirin",
                patientContext = new { patientId = "synthetic-1", birthDate = "1970-01-01" },
            });
        response.EnsureSuccessStatusCode();
        var raw = await response.Content.ReadAsStringAsync();
        var body = JsonNode.Parse(raw)!;

        Assert.Equal(["patientId", "birthDate"], body["patientContextFields"]!.AsArray().Select(f => f!.GetValue<string>()));
        Assert.DoesNotContain("synthetic-1", raw, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CheckEndpoint_MissingMedication_ReturnsBadRequest()
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(
            new Uri("/interactions/check", UriKind.Relative),
            new { medicationA = "warfarin", medicationB = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
