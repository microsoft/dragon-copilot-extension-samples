# Partner Extension Sample — AI

A radiology extension for Dragon Copilot that performs **AI-powered**
quality checks. This sample wires up Azure OpenAI for cloud inference
and falls back to an on-device Foundry Local model when Azure OpenAI
is not configured. Use it as the starting point for partners that need
real model inference; copy the project, replace the prompt and result
handling with your own implementation, and deploy a working extension
that follows the expected contract.

## What's included

- ASP.NET Core Web API (.NET 10, Windows-only because of Foundry Local), single controller: `POST /v1/process`
- JWT authentication via Microsoft Entra ID, toggleable via `Authentication.Enabled` in `appsettings.json`
- AI-powered quality checks via Azure OpenAI **or** an on-device model through Microsoft.AI.Foundry.Local
- Swagger UI at the app root in Development
- Health probes at `/health/liveness` and `/health/readiness`

## Run locally

```powershell
dotnet run --project SampleExtension.Radiology.Web.Ai
```

Available endpoints:

- Swagger UI: http://localhost:5080/
- Health: `/health/liveness`, `/health/readiness`

A `.http` file (`SampleExtension.Radiology.Web.Ai.http`) is included for
sending sample requests from Visual Studio or VS Code.

## Security

The application validates JWT bearer tokens on all routes except health probes
and Swagger UI. Authentication is configurable via `appsettings.json`.

### JWT Authentication (Microsoft Entra ID)

Validates that every incoming request carries a valid Bearer token issued by
the configured Entra ID tenant. Requests with a missing, expired, or invalid
token receive a **401 Unauthorized** response.

Configure in the `Authentication` section of `appsettings.json`:

| Setting          | Description                       |
| ---------------- | --------------------------------- |
| `Enabled`        | Enable or disable authentication  |
| `TenantId`       | Your Entra ID tenant ID           |
| `ClientId`       | Your app registration's client ID |
| `Instance`       | Login endpoint                    |
| `RequiredClaims` | Additional claims to enforce      |

### Local development

When you first clone or download the repository, authentication is disabled by
default so the API can be called without tokens.

See [`appsettings.json`](./appsettings.json) for the full schema, defaults,
and inline comments describing each setting.

### Enabling security for production

To enable security:

1. Register an application in [Microsoft Entra ID](https://entra.microsoft.com/).
2. Set `Authentication.Enabled` to `true` and populate `TenantId`, `ClientId`,
   and allowed caller client IDs in `RequiredClaims.azp`.

Example with security enabled:

```jsonc
{
    "Authentication": {
        "Enabled": true,
        "TenantId": "00000000-0000-0000-0000-000000000000",
        "ClientId": "11111111-1111-1111-1111-111111111111",
        "Instance": "https://login.microsoftonline.com/",
        "MapInboundClaims": false,
        "AllowWebApiToBeAuthorizedByACL": true,
        "RequiredClaims": {
            "idtyp": ["app"],
            "azp": [
                "22222222-2222-2222-2222-222222222222",
                "33333333-3333-3333-3333-333333333333",
            ],
        },
    },
}
```

Once enabled, callers must include the bearer token on every request:

```
Authorization: Bearer <entra-id-jwt>
```

## Quality check provider

The extension performs the AI-powered quality check using one of two providers,
selected automatically in this priority order:

1. **Azure OpenAI** — used when `OpenAI.Endpoint`, `OpenAI.ApiKey`, and
   `OpenAI.DeploymentName` are all set in `appsettings.json`.
2. **Foundry Local** — used when Azure OpenAI is not configured and
   `FoundryLocal.Enabled` is `true`. Runs an on-device model with no cloud
   calls. Enabled by default so the sample runs out-of-the-box (the model
   downloads on first use).

If neither provider is available (Azure OpenAI not configured **and**
`FoundryLocal.Enabled` is `false`), the service throws an
`InvalidOperationException` on the first request — by design, so misconfigured
deployments fail fast rather than silently returning empty results.

## Azure OpenAI Configuration

The extension can use Azure OpenAI for AI-powered quality checks. Deploy your
own model and update the `OpenAI` section in `appsettings.json`.

### Setting up Azure AI Foundry and deploying a model

To configure the AI-powered quality check, you need an Azure OpenAI model deployment.

1. **Create an Azure AI Foundry resource** and **deploy a model** (e.g., `gpt-4o-mini`).
   Follow the official guide:
   [Deploy Microsoft Foundry Models in the Foundry portal](https://learn.microsoft.com/azure/foundry/foundry-models/how-to/deploy-foundry-models)

2. **Get the endpoint and API key** from your resource's **Keys and Endpoint** page
   in the Azure Portal.

3. **Update `appsettings.json`** — replace the placeholder values in the `OpenAI` section:

    ```jsonc
    "OpenAI": {
      "Endpoint": "https://<your-resource-name>.openai.azure.com/",
      "ApiKey": "<your-api-key>",
      "DeploymentName": "<your-deployment-name>"
    }
    ```

For production deployments, store the API key in a secure location such as
Azure Key Vault or environment variables rather than in `appsettings.json`.

## Foundry Local (on-device model) Configuration

Foundry Local runs a small language model directly on the host machine with no
cloud dependency. Requires Windows 10 build 26100 or later.

Configure in the `FoundryLocal` section of `appsettings.json`:

| Setting      | Description                                                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Enabled`    | When `true`, Foundry Local is used if Azure OpenAI is not configured. Defaults to `true` so the sample runs out-of-the-box. Set to `false` to require Azure OpenAI configuration.                                 |
| `ModelAlias` | Foundry Local model alias to download and load. Defaults to `qwen2.5-1.5b`. Other options: `qwen2.5-0.5b`, `phi-3.5-mini`, `phi-4-mini`, `mistral-7b`, `gpt-oss-20b`.                                             |
| `DeviceType` | `CPU`, `GPU`, or `NPU`. Defaults to `CPU` so the sample runs on machines without a GPU/NPU.                                                                                                                       |
| `AppName`    | Application name passed to Foundry Local; used for log/data directory naming.                                                                                                                                     |
| `AppDataDir` | Local directory for the model cache and logs. Empty (default) uses `%USERPROFILE%\.foundry` so the cache is shared with other Foundry Local apps and tools on the same machine. Set an absolute path to override. |

### First-run behavior

On the first request that uses Foundry Local, the configured model is
downloaded into the local cache and loaded into memory before inference runs.
Depending on model size and network speed, this can take from several seconds
to several minutes.

The first request takes time while the model downloads and loads. You can
send request using an HTTP client tool such as Bruno, or use the included `.http`
file — in that case, raise the request timeout (for example by adding
`# @timeout 600` above the request) so the model has time to download and
load.

Subsequent requests reuse the loaded model and respond quickly.

## Request / response contract

See [`radiology-extensibility-api.yaml`](../../../../radiology-extensibility-api.yaml) for the full OpenAPI spec.

Only `sessionData` is required. `extensibilityApiVersion` shows which Dragon Copilot API version sent the request, and your extension does not need to read it. Extra fields are accepted, so your extension keeps working as the API evolves.

**`POST /v1/process`** with `application/json`

```jsonc
{
    "extensibilityApiVersion": "1.1.1",
    "sessionData": {
        "correlation_id": "abc-123",
        "session_start": "2025-01-01T10:00:00Z",
        "environment_id": "env-456",
    },
    "patientInformation": {
        "dateOfBirth": "1980-05-12",
        "biologicalSex": "Female",
    },
    "report": {
        "reportText": "CT ABDOMEN … paddock steatosis …",
    },
}
```

Response:

```jsonc
{
    "success": true,
    "message": "Payload processed successfully.",
    "payload": {
        "qualityCheckResult": {
            "recommendations": [
                /* ... */
            ],
        },
    },
}
```
