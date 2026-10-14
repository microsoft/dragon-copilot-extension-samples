# Conversational Extensions — Quick Start

Build, run and package the MCP sample end to end in about 15 minutes. The [OpenAPI](src/samples/OpenApi/README.md) and [Copilot Studio](src/samples/CopilotStudio/README.md) samples follow the same flow.

> **Public Preview.** Uses manifest schema [`0.4.0-preview.2`](manifest/0.4.0-preview.2/manifest-schema.json).

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/) (for the CLI)
- Optional: [Docker](https://www.docker.com/), [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

## 1. Run the MCP sample

```bash
dotnet run --project conversational/src/samples/Mcp/SampleConversational.Mcp.Web
```

Check `http://localhost:5190/health` returns `"status": "healthy"`. Authentication is off in `Development`.

## 2. Call a tool

Use [`SampleConversational.Mcp.Web.http`](src/samples/Mcp/SampleConversational.Mcp.Web/SampleConversational.Mcp.Web.http) in VS Code / Visual Studio, or:

```bash
curl -s http://localhost:5190/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"lookup_reference_range","arguments":{"test":"potassium"}}}'
```

The result's `structuredContent.summary` is what the manifest maps to the response text.

## 3. Run the tests

```bash
dotnet test conversational/src/samples/SampleConversational.slnx
```

## 4. Install the CLI

```bash
cd tools/dragon-copilot-cli
npm ci && npm run build && npm link
```

## 5. Validate and package the manifest

Edit [`extension.yaml`](src/samples/Mcp/SampleConversational.Mcp.Web/extension.yaml): set `auth.tenantId` and replace `https://your-mcp-host.example.com/mcp` with your public endpoint.

```bash
cd conversational/src/samples/Mcp/SampleConversational.Mcp.Web
dragon-copilot conversational validate extension.yaml
dragon-copilot conversational package --manifest extension.yaml
```

Starting from scratch instead?

```bash
dragon-copilot conversational init --type MCP --name my-extension
dragon-copilot conversational generate --template openapi   # add another tool
```

## 6. Deploy and onboard

1. Deploy the container (build from the repo root):
   ```bash
   docker build -f conversational/src/samples/Mcp/SampleConversational.Mcp.Web/Dockerfile -t sample-conversational-mcp .
   ```
2. Enable authentication — set `Authentication:TenantId` / `ClientId` ([guide](../doc/Authentication.md)).
3. Upload the package in the Dragon admin center (sideload) or publish via the [marketplace](https://admin.healthplatform.microsoft.com/marketplace). See [Onboarding](README.md#-onboarding).
4. Ask Dragon Copilot: *"What is the normal range for potassium?"*

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tool never selected | Make the tool `description` say clearly *when* to use it. |
| Validation: trigger not allowed | Conversational tools must use `triggers: [IntentDriven]`. |
| Validation: unknown property | Fields are type-specific (e.g. no `endpoint` on `OpenAPI`, no `expose` on `CopilotStudio`). |
| Timeouts | Raise `timeout` (max 60 seconds). |
