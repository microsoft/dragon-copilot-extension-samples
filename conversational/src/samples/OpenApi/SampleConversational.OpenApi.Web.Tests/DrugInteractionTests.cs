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
