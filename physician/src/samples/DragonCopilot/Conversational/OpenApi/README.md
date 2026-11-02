# OpenAPI Conversational Extension Sample

ASP.NET Core (.NET 10) REST API described by an OpenAPI 3.0 document. Dragon Copilot reads the spec from `specUrl` and calls the operations listed in `expose`.

> **Public Preview.** Conversational extensions use manifest schema [`0.4.0-preview.2`](../../../../../manifest/0.4.0-preview.2/manifest-schema.json), which may change.

## Operation

| operationId | Route | What it does |
| --- | --- | --- |
| `checkDrugInteraction` | `POST /interactions/check` | Checks two medications against a small synthetic interaction table. Returns `summary`, `severity`, `sources[].url` and `correlationId`. |

The `operationId` is what the manifest references in `expose`, `customExtractors` and `runtimeParamBindings`.

## Run locally

All commands below run from the **repository root**.

```bash
dotnet run --project physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web
```

- OpenAPI document: `http://localhost:5191/openapi/v1.json`
- Swagger UI: `http://localhost:5191/swagger`
- Health: `http://localhost:5191/health`

`dotnet run` uses the `Development` environment, where [`appsettings.Development.json`](SampleConversational.OpenApi.Web/appsettings.Development.json) turns authentication off and the service logs a warning at startup. Try [`SampleConversational.OpenApi.Web.http`](SampleConversational.OpenApi.Web/SampleConversational.OpenApi.Web.http).

### Public URL and proxies

Dragon Copilot calls the URL in the document's `servers` entry, so it must be the externally reachable `https://` URL.

- `PublicUrl` is empty by default (in both [`appsettings.json`](SampleConversational.OpenApi.Web/appsettings.json) and `appsettings.Development.json`), so `servers` is built from the incoming request's scheme and host.
- Behind a TLS-terminating proxy, ingress or gateway, the service honors `X-Forwarded-Proto` and `X-Forwarded-Host` (ASP.NET Core forwarded headers middleware). By default only loopback proxies are trusted; add your proxy to `ForwardedHeadersOptions.KnownProxies` / `KnownIPNetworks` in `Program.cs`, and restrict `AllowedHosts` to your public host name.
- Alternatively set `PublicUrl` (for example `-e PublicUrl=https://api.contoso.example`) to pin the published URL regardless of headers.

## Test

```bash
dotnet test physician/src/samples/DragonCopilot/Conversational/SampleConversational.slnx
```

## Container

Build from the **repository root**:

```bash
docker build -f physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/Dockerfile -t sample-conversational-openapi .
```

Production-style run (authentication on; replace the placeholders):

```bash
docker run -p 8080:8080 \
  -e Authentication__TenantId=<your-tenant-id> \
  -e Authentication__ClientId=<your-client-id> \
  -e Authentication__AllowedCallerAppIds__0=<caller-app-id> \
  -e PublicUrl=https://<your-public-host> \
  sample-conversational-openapi
```

> [!WARNING]
> `-e ASPNETCORE_ENVIRONMENT=Development` turns authentication **off**: anyone who can reach the port can call the API. Use it only on your own machine, never on a reachable host.
>
> ```bash
> docker run -p 8080:8080 -e ASPNETCORE_ENVIRONMENT=Development sample-conversational-openapi
> ```

## Authentication

The API fails closed: it requires a Microsoft Entra ID app-only bearer token unless `Authentication:Enabled` is `false` **and** the environment is `Development`. Outside `Development`, `Enabled: false` is ignored (with a warning). Configure in [`appsettings.json`](SampleConversational.OpenApi.Web/appsettings.json) or environment variables:

| Setting | Value |
| --- | --- |
| `Authentication:TenantId` | Tenant of your extension's app registration (the same value as `auth.tenantId` in the manifest). |
| `Authentication:ClientId` | Client ID of your extension's app registration (the token audience). |
| `Authentication:AllowedCallerAppIds` | Application (client) IDs allowed to call the API, checked against the token's `azp` (v2.0) or `appid` (v1.0) claim. The default is the Dragon Copilot Extension Runtime application ID (`d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8`), the same caller used for `DragonAPI` tools; see [Authentication Design](../../../../../../doc/AuthenticationDesign.md). Startup fails if the list is empty while authentication is on. |
| `Authentication:RequiredClaims` | Extra required claims. The default requires `idtyp` = `app` (app-only tokens). |

See [How Dragon Copilot calls your tool](../../../../../CONVERSATIONAL.md#how-dragon-copilot-calls-your-tool) and [Authentication](../../../../../../doc/Authentication.md) for the general pattern.
## Manifest

[`extension.yaml`](SampleConversational.OpenApi.Web/extension.yaml) shows:

- **`specUrl`** — where Dragon Copilot fetches the OpenAPI document (or inline it with `specString`).
- **`expose`** — operationIds Dragon Copilot may call.
- **`customExtractors`** — `$.summary` → `Response Text`, `$.sources[*].url` → `Evidence Link`.
- **`runtimeParamBindings`** — keyed by operationId:
  - `locale` → request body `locale` (`target: body`, the default for OpenAPI).
  - `patientContext` → request body `patientContext` (`target: body`, `required: false`). It is a JSON object, declared as an optional property of the request body in the published OpenAPI document. It is **PHI**: log the source name only, never the value. The sample returns only its top-level field names.
  - `correlationId` → header `x-correlation-id` (`target: header`).

  Bound body fields (`locale`, `patientContext`) are declared as normal optional properties, so the spec is accurate for any client. Dragon Copilot removes body-bound fields from the schema its model sees and overwrites any model-supplied value with the bound one. Declare every bound body path in the request schema, and do not mark a bound field as required unless it always has a value.

Update `specUrl` and `auth.tenantId`, then:

```bash
dragon-copilot physician validate SampleConversational.OpenApi.Web/extension.yaml
dragon-copilot physician package --manifest SampleConversational.OpenApi.Web/extension.yaml
```

Onboard the package as described in [Onboarding](../../../../../CONVERSATIONAL.md#-onboarding).

## Test prompt

> "Can a patient take warfarin and aspirin together?"
