// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SampleConversational.Mcp.Web.Tests;

public class McpEndpointTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_ReturnsOk()
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync(new Uri("/health", UriKind.Relative));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ToolsList_ReturnsBothTools()
    {
        var result = await PostMcpAsync("""{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }""");
        var names = result["tools"]!.AsArray().Select(t => t!["name"]!.GetValue<string>()).ToList();

        Assert.Contains("lookup_reference_range", names);
        Assert.Contains("extract_orders", names);
    }

    [Fact]
    public async Task ExtractOrders_UsesInjectedTranscriptAndSideChannel()
    {
        var result = await PostMcpAsync("""
            {
              "jsonrpc": "2.0", "id": 2, "method": "tools/call",
              "params": {
                "name": "extract_orders",
                "arguments": { "transcript": "Order a CBC." },
                "_meta": { "dragon": { "conversationId": "conv-42" } }
              }
            }
            """);

        var structured = result["structuredContent"]!;
        Assert.Equal("conv-42", structured["conversationId"]!.GetValue<string>());
        Assert.NotEmpty(structured["orders"]!.AsArray());
        Assert.False(string.IsNullOrWhiteSpace(structured["summary"]!.GetValue<string>()));
    }

    private async Task<JsonNode> PostMcpAsync(string body)
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/mcp", UriKind.Relative))
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("Accept", "application/json, text/event-stream");

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadAsStringAsync();

        // Streamable HTTP responds with SSE; take the JSON-RPC message from the data line.
        var json = payload.Split('\n')
            .Select(line => line.Trim())
            .Where(line => line.StartsWith("data:", StringComparison.Ordinal))
            .Select(line => line["data:".Length..].Trim())
            .LastOrDefault() ?? payload;

        return JsonNode.Parse(json)!["result"]!;
    }
}
