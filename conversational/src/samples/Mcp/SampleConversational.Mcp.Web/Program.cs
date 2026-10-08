// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using ModelContextProtocol.Protocol;
using SampleConversational.Mcp.Web.Extensions;
using SampleConversational.Mcp.Web.Tools;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCustomAuthentication(builder.Configuration);

// MCP server over streamable HTTP. Stateless mode lets any replica serve any request,
// which suits Dragon Copilot's per-turn tool calls and horizontal scaling.
builder.Services
    .AddMcpServer(options => options.ServerInfo = new Implementation { Name = "contoso-clinical-mcp", Version = "1.0.0" })
    .WithHttpTransport(options => options.Stateless = true)
    .WithTools<ClinicalTools>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// Public health probe.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .AllowAnonymous();

// MCP endpoint referenced by the manifest's `endpoint` (https://<host>/mcp).
app.MapMcp("/mcp").RequireAuthorization(AuthenticationExtensions.RequiredClaimsPolicy);

await app.RunAsync().ConfigureAwait(false);

/// <summary>
/// Entry point (exposed for integration tests).
/// </summary>
public partial class Program;
