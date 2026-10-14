# MCP Conversational Extension Sample

ASP.NET Core (.NET 9) [Model Context Protocol](https://modelcontextprotocol.io/) server that Dragon Copilot can call during a conversation. It uses the official [C# MCP SDK](https://github.com/modelcontextprotocol/csharp-sdk) over Streamable HTTP.

> **Public Preview.** Conversational extensions use manifest schema [`0.4.0-preview.2`](../../../manifest/0.4.0-preview.2/manifest-schema.json), which may change.

## Tools

| MCP tool | Manifest tool | What it does |
| --- | --- | --- |
| `lookup_reference_range` | `clinical-reference` | Returns typical adult reference ranges for common labs (synthetic table). |
| `extract_orders` | `order-extraction` | Extracts lab/imaging/medication/referral orders from the encounter transcript. |

Both return structured content with a `summary` field that the manifest maps to the response text.

## Run locally

```bash
cd conversational/src/samples/Mcp/SampleConversational.Mcp.Web
dotnet run
```

- MCP endpoint: `http://localhost:5190/mcp`
- Health: `http://localhost:5190/health`

Authentication is disabled in `Development` ([`appsettings.Development.json`](SampleConversational.Mcp.Web/appsettings.Development.json)). Try the requests in [`SampleConversational.Mcp.Web.http`](SampleConversational.Mcp.Web/SampleConversational.Mcp.Web.http) or connect the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to the endpoint.

## Test

```bash
dotnet test conversational/src/samples/SampleConversational.slnx
```

## Container

Build from the **repository root** (the Dockerfile uses shared build props):

```bash
docker build -f conversational/src/samples/Mcp/SampleConversational.Mcp.Web/Dockerfile -t sample-conversational-mcp .
docker run -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Development sample-conversational-mcp
```

## Authentication

Outside `Development`, the server requires a Microsoft Entra ID app-only bearer token. Set `Authentication:TenantId` and `Authentication:ClientId` in [`appsettings.json`](SampleConversational.Mcp.Web/appsettings.json). See [Authentication](../../../../doc/Authentication.md) for the general pattern.

## Manifest

[`extension.yaml`](SampleConversational.Mcp.Web/extension.yaml) registers the server twice, once per tool, to show:

- **`expose`** — which MCP tools Dragon Copilot may call (allow-list).
- **`customExtractors`** — keyed by MCP tool name; map JSON paths in the result to `Response Text` / `Evidence Link`.
- **`runtimeParamBindings`** — keyed by MCP tool name; inject Dragon runtime values the user never types:
  - `transcript` → tool argument `transcript` (`target: argument`).
  - `conversationId` → MCP `_meta` `dragon.conversationId` (`target: sideChannel`, hidden from the model).

Update `endpoint` and `auth.tenantId`, then:

```bash
dragon-copilot conversational validate SampleConversational.Mcp.Web/extension.yaml
dragon-copilot conversational package --manifest SampleConversational.Mcp.Web/extension.yaml
```

Onboard the package as described in [Onboarding](../../../README.md#-onboarding).

## Test prompts

> "What is the normal range for potassium?"

> "Which orders were placed in this visit?"
