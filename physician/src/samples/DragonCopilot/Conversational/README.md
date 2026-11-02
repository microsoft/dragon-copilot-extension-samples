# Conversational Extensions — Quick Start

Build, run and package the MCP sample end to end in about 15 minutes. The [OpenAPI](OpenApi/README.md) and [Copilot Studio](CopilotStudio/README.md) samples follow the same flow.

> **Public Preview.** Uses manifest schema [`0.4.0-preview.2`](../../../../../tools/dragon-copilot-cli/src/schemas/physician/physician-extension-manifest-schema-0.4.0-preview.2.json).

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/) (for the CLI)
- Optional: [Docker](https://www.docker.com/), [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

## 1. Run the MCP sample

```bash
dotnet run --project physician/src/samples/DragonCopilot/Conversational/Mcp/SampleConversational.Mcp.Web
```

Check `http://localhost:5190/health` returns `"status": "healthy"`. Authentication is off in `Development`.

## 2. Call a tool

Use [`SampleConversational.Mcp.Web.http`](Mcp/SampleConversational.Mcp.Web/SampleConversational.Mcp.Web.http) in VS Code / Visual Studio, or:

```bash
curl -s http://localhost:5190/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"lookup_reference_range","arguments":{"test":"potassium"}}}'
```

The tool returns a JSON object (also serialized as the result's text content). The manifest's `customExtractors` path `$.summary` is evaluated against that object, so its `summary` field becomes the response text.

## 3. Run the tests

```bash
dotnet test physician/src/samples/DragonCopilot/Conversational/SampleConversational.slnx
```

## 4. Install the CLI

```bash
cd tools/dragon-copilot-cli
npm ci && npm run build && npm link
```

## 5. Validate and package the manifest

Edit [`extension.yaml`](Mcp/SampleConversational.Mcp.Web/extension.yaml): set `auth.tenantId` and replace `https://your-mcp-host.example.com/mcp` with your public endpoint.

```bash
cd physician/src/samples/DragonCopilot/Conversational/Mcp/SampleConversational.Mcp.Web
dragon-copilot physician validate extension.yaml
dragon-copilot physician package --manifest extension.yaml
```

Starting from scratch instead?

```bash
dragon-copilot physician init --schema-version 0.4.0-preview.2 --type MCP --name my-extension
dragon-copilot physician generate --schema-version 0.4.0-preview.2 --template openapi --output openapi.yaml
```

## 6. Deploy and onboard

1. Deploy the container (build from the repo root):
   ```bash
   docker build -f physician/src/samples/DragonCopilot/Conversational/Mcp/SampleConversational.Mcp.Web/Dockerfile -t sample-conversational-mcp .
   ```
2. Configure authentication — set `Authentication:TenantId`, `ClientId` and `AllowedCallerAppIds` (see the [MCP sample README](Mcp/README.md#authentication) and [How Dragon Copilot calls your tool](../../../../CONVERSATIONAL.md#how-dragon-copilot-calls-your-tool)). Authentication is on in every environment except `Development`.
3. Upload the package in the Dragon admin center (sideload) or publish via the [marketplace](https://admin.healthplatform.microsoft.com/marketplace). See [Onboarding](../../../../CONVERSATIONAL.md#-onboarding).
4. Ask Dragon Copilot: *"What is the normal range for potassium?"*

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tool never selected | Make the tool `description` say clearly *when* to use it. |
| Validation: trigger not allowed | Conversational tools must use `triggers: [IntentDriven]`. |
| Validation: unknown property | Fields are type-specific (e.g. no `endpoint` on `OpenAPI`, no `expose` on `CopilotStudio`). |
| Timeouts | Raise `timeout` (5–60 seconds). |
