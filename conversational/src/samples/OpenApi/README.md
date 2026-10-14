# OpenAPI Conversational Extension Sample

ASP.NET Core (.NET 9) REST API described by an OpenAPI 3.0 document. Dragon Copilot reads the spec from `specUrl` and calls the operations listed in `expose`.

> **Public Preview.** Conversational extensions use manifest schema [`0.4.0-preview.2`](../../../manifest/0.4.0-preview.2/manifest-schema.json), which may change.

## Operation

| operationId | Route | What it does |
| --- | --- | --- |
| `checkDrugInteraction` | `POST /interactions/check` | Checks two medications against a small synthetic interaction table. Returns `summary`, `severity`, `sources[].url` and `correlationId`. |

The `operationId` is what the manifest references in `expose`, `customExtractors` and `runtimeParamBindings`.

## Run locally

```bash
cd conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web
dotnet run
```

- OpenAPI document: `http://localhost:5191/openapi/v1.json`
- Swagger UI: `http://localhost:5191/swagger`
- Health: `http://localhost:5191/health`

Authentication is disabled in `Development`. Try [`SampleConversational.OpenApi.Web.http`](SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.http).

Set `PublicUrl` in [`appsettings.json`](SampleConversational.OpenApi.Web/appsettings.json) so the document's `servers` entry points at your public host.

## Test

```bash
dotnet test conversational/src/samples/SampleConversational.slnx
```

## Container

Build from the **repository root**:

```bash
docker build -f conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/Dockerfile -t sample-conversational-openapi .
docker run -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Development sample-conversational-openapi
```

## Authentication

Outside `Development`, the API requires a Microsoft Entra ID app-only bearer token (`Authentication:TenantId` / `Authentication:ClientId`). See [Authentication](../../../../doc/Authentication.md).

## Manifest

[`extension.yaml`](SampleConversational.OpenApi.Web/extension.yaml) shows:

- **`specUrl`** — where Dragon Copilot fetches the OpenAPI document (or inline it with `specString`).
- **`expose`** — operationIds Dragon Copilot may call.
- **`customExtractors`** — `$.summary` → `Response Text`, `$.sources[*].url` → `Evidence Link`.
- **`runtimeParamBindings`** — keyed by operationId:
  - `locale` → request body `locale` (`target: body`, the default for OpenAPI).
  - `correlationId` → header `x-correlation-id` (`target: header`).

Update `specUrl` and `auth.tenantId`, then:

```bash
dragon-copilot conversational validate SampleConversational.OpenApi.Web/extension.yaml
dragon-copilot conversational package --manifest SampleConversational.OpenApi.Web/extension.yaml
```

Onboard the package as described in [Onboarding](../../../README.md#-onboarding).

## Test prompt

> "Can a patient take warfarin and aspirin together?"
