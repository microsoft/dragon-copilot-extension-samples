# Conversational Extensions — Quick Start

Build, run and package the [OpenAPI](OpenApi/README.md) sample end to end in about 15 minutes. The [Copilot Studio](CopilotStudio/README.md) sample follows the same validate, package and onboard flow.

> **Public Preview.** Uses manifest schema [`0.4.0-preview.2`](../../../../../tools/dragon-copilot-cli/src/schemas/physician/physician-extension-manifest-schema-0.4.0-preview.2.json).

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js](https://nodejs.org/) `^22.22.2 || ^24.15.0 || >=26.0.0` (for the CLI; see the [CLI README](../../../../../tools/dragon-copilot-cli/README.md))
- Optional: [Docker](https://www.docker.com/)

## 1. Run the OpenAPI sample

```bash
dotnet run --project physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web
```

Check `http://localhost:5191/health` returns `"status": "healthy"`. Authentication is off in `Development`.

## 2. Call an operation

Use [`SampleConversational.OpenApi.Web.http`](OpenApi/SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.http) in VS Code / Visual Studio, or:

```bash
curl -s http://localhost:5191/interactions/check \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: 00000000-0000-0000-0000-000000000001" \
  -d '{"medicationA":"warfarin","medicationB":"aspirin","locale":"en-US"}'
```

The operation returns a JSON response body. The manifest's `customExtractors` path `$.summary` is evaluated against that body, so its `summary` field becomes the response text.

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

Edit [`extension.yaml`](OpenApi/SampleConversational.OpenApi.Web/extension.yaml): set `auth.tenantId` and replace `https://your-api-host.example.com/openapi/v1.json` with your public OpenAPI document URL.

```bash
cd physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web
dragon-copilot physician validate extension.yaml
dragon-copilot physician package --manifest extension.yaml
```

Starting from scratch instead?

```bash
dragon-copilot physician init --schema-version 0.4.0-preview.2 --type OpenAPI --name my-extension
dragon-copilot physician generate --schema-version 0.4.0-preview.2 --template copilot-studio --output copilot-studio.yaml
```

## 6. Deploy and onboard

1. Deploy the container (build from the repo root):
   ```bash
   docker build -f physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/Dockerfile -t sample-conversational-openapi .
   ```
2. Configure authentication — set `Authentication:TenantId`, `ClientId` and `AllowedCallerAppIds` (see the [OpenAPI sample README](OpenApi/README.md#authentication) and [How Dragon Copilot calls your tool](../../../../CONVERSATIONAL.md#how-dragon-copilot-calls-your-tool)). Authentication is on in every environment except `Development`.
3. Upload the package in the Dragon admin center (sideload) or publish via the [marketplace](https://admin.healthplatform.microsoft.com/marketplace). See [Onboarding](../../../../CONVERSATIONAL.md#-onboarding).
4. Ask Dragon Copilot: *"Can a patient take warfarin and aspirin together?"*

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tool never selected | Make the tool `description` say clearly *when* to use it. |
| Validation: trigger not allowed | Conversational tools must use `triggers: [IntentDriven]`. |
| Validation: unknown property | Fields are type-specific (e.g. no `endpoint` on `OpenAPI`, no `expose` on `CopilotStudio`). |
| Timeouts | Raise `timeout` (5–60 seconds). |
