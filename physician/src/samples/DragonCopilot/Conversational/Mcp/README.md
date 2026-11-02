# MCP Conversational Extension Sample

ASP.NET Core (.NET 9) [Model Context Protocol](https://modelcontextprotocol.io/) server that Dragon Copilot can call during a conversation. It uses the official [C# MCP SDK](https://github.com/modelcontextprotocol/csharp-sdk) over Streamable HTTP.

> **Public Preview.** Conversational extensions use manifest schema [`0.4.0-preview.2`](../../../../../manifest/0.4.0-preview.2/manifest-schema.json), which may change.

## Tools

| MCP tool | Manifest tool | What it does |
| --- | --- | --- |
| `lookup_reference_range` | `clinical-reference` | Returns typical adult reference ranges for common labs (synthetic table). |
| `extract_orders` | `order-extraction` | Extracts lab/imaging/medication/referral orders from the encounter transcript. |

Both return structured content with a `summary` field that the manifest maps to the response text.

## Run locally

All commands below run from the **repository root**.

```bash
dotnet run --project physician/src/samples/DragonCopilot/Conversational/Mcp/SampleConversational.Mcp.Web
```

- MCP endpoint: `http://localhost:5190/mcp`
- Health: `http://localhost:5190/health`

`dotnet run` uses the `Development` environment, where [`appsettings.Development.json`](SampleConversational.Mcp.Web/appsettings.Development.json) turns authentication off and the server logs a warning at startup. Try the requests in [`SampleConversational.Mcp.Web.http`](SampleConversational.Mcp.Web/SampleConversational.Mcp.Web.http) or connect the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to the endpoint.

## Test

```bash
dotnet test physician/src/samples/DragonCopilot/Conversational/SampleConversational.slnx
```

## Container

Build from the **repository root** (the Dockerfile uses shared build props):

```bash
docker build -f physician/src/samples/DragonCopilot/Conversational/Mcp/SampleConversational.Mcp.Web/Dockerfile -t sample-conversational-mcp .
```

Production-style run (authentication on; replace the placeholders):

```bash
docker run -p 8080:8080 \
  -e Authentication__TenantId=<your-tenant-id> \
  -e Authentication__ClientId=<your-client-id> \
  -e Authentication__AllowedCallerAppIds__0=<caller-app-id> \
  sample-conversational-mcp
```

> [!WARNING]
> `-e ASPNETCORE_ENVIRONMENT=Development` turns authentication **off**: anyone who can reach the port can call the tools. Use it only on your own machine, never on a reachable host.
>
> ```bash
> docker run -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Development sample-conversational-mcp
> ```

## Authentication

The server fails closed: it requires a Microsoft Entra ID app-only bearer token unless `Authentication:Enabled` is `false` **and** the environment is `Development`. Outside `Development`, `Enabled: false` is ignored (with a warning). Configure in [`appsettings.json`](SampleConversational.Mcp.Web/appsettings.json) or environment variables:

| Setting | Value |
| --- | --- |
| `Authentication:TenantId` | Tenant of your extension's app registration (the same value as `auth.tenantId` in the manifest). |
| `Authentication:ClientId` | Client ID of your extension's app registration (the token audience). |
| `Authentication:AllowedCallerAppIds` | Application (client) IDs allowed to call the server, checked against the token's `azp` (v2.0) or `appid` (v1.0) claim. The default is the Dragon Copilot Extension Runtime application ID (`d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8`), the same caller used for `DragonAPI` tools; see [Authentication Design](../../../../../../doc/AuthenticationDesign.md). Startup fails if the list is empty while authentication is on. |
| `Authentication:RequiredClaims` | Extra required claims. The default requires `idtyp` = `app` (app-only tokens). |

See [How Dragon Copilot calls your tool](../../../../../CONVERSATIONAL.md#how-dragon-copilot-calls-your-tool) and [Authentication](../../../../../../doc/Authentication.md) for the general pattern.
## Manifest

[`extension.yaml`](SampleConversational.Mcp.Web/extension.yaml) registers the server twice, once per tool, to show:

- **`expose`** — which MCP tools Dragon Copilot may call (allow-list).
- **`customExtractors`** — keyed by MCP tool name; map JSON paths in the result to `Response Text` / `Evidence Link`.
- **`runtimeParamBindings`** — keyed by MCP tool name; inject Dragon runtime values the user never types:
  - `transcript` → tool argument `transcript` (`target: argument`). The value is the transcript **object** `{ "transcript": { "turns": [ { "speaker": ..., "text": ... } ] } }` (use source `transcriptTurns` to receive only the inner `{ "turns": [...] }`), not a string. It can be missing on a request, so the argument is optional and the tool handles its absence. It is **PHI**: never log the value.
  - `patientContext` → optional tool argument `patientContext` (`target: argument`, `required: false`). The value is a JSON object and is **PHI**: log the source name only, never the value. The sample returns only its top-level field names.
  - `conversationId` → MCP `_meta` `dragon.conversationId` (`target: sideChannel`, hidden from the model).

  `transcript` and `patientContext` are declared as normal (optional) parameters of `extract_orders`, so the tool schema is accurate and the server works with any MCP client. Dragon Copilot removes argument-bound parameters from the schema its model sees and overwrites any model-supplied value with the bound one. Do not mark a bound argument as required unless it always has a value, and declare every bound argument path in the tool's `inputSchema`.

Update `endpoint` and `auth.tenantId`, then:

```bash
dragon-copilot physician validate SampleConversational.Mcp.Web/extension.yaml
dragon-copilot physician package --manifest SampleConversational.Mcp.Web/extension.yaml
```

Onboard the package as described in [Onboarding](../../../../../CONVERSATIONAL.md#-onboarding).

## Test prompts

> "What is the normal range for potassium?"

> "Which orders were placed in this visit?"
