# Partner Extension Sample — AI (Azure OpenAI)

A radiologists extension for Dragon Copilot that performs **AI-powered**
quality checks via **Azure OpenAI**. This sample is **cross-platform**
(`net10.0`) and is the real-model example partners can build and run on
Windows, Linux, or macOS. Use it as the starting point for partners that
need real model inference; copy the project, replace the prompt and result
handling with your own implementation, and deploy a working extension that
follows the expected contract.

> **Want on-device inference instead?** See the
> [`SampleExtension.Radiologists.Web.Local`](../SampleExtension.Radiologists.Web.Local/README.md)
> sample, which runs a local model via Foundry Local (**Windows-only**).

## What's included

- ASP.NET Core Web API (.NET 10, **cross-platform**), single controller: `POST /v1/process`
- JWT authentication via Microsoft Entra ID, toggleable via `Authentication.Enabled` in `appsettings.json`
- AI-powered quality checks via **Azure OpenAI**
- Swagger UI at the app root in Development
- Health probes at `/health/liveness` and `/health/readiness` (JSON responses)

## Extension manifest

All Radiologists Workflow samples implement the **same** extension contract, so they
share one manifest: [`extension.yaml`](../extension.yaml). It declares the
`qualityCheck` tool, its inputs and outputs, and the endpoint
(`http://localhost:5080/v1/process`), and it's what you register with Dragon
Copilot so it can call your extension. Update `endpoint` and `auth.tenantId` for
your deployment, along with `name`, `description`, `version`, and the optional
`relevanceFilteringCriteria`, or regenerate it with the CLI:

```bash
dragon-copilot radiologists generate --template quality-check
```

## API endpoints

| Method | Route               | Auth   | Description                                         |
| ------ | ------------------- | ------ | --------------------------------------------------- |
| POST   | `/v1/process`       | JWT    | Analyzes a radiology report, returns quality checks |
| GET    | `/health/liveness`  | Public | Liveness probe, returns `{"status":"Healthy"}`      |
| GET    | `/health/readiness` | Public | Readiness probe, returns `{"status":"Healthy"}`     |
| GET    | `/`                 | Public | Swagger UI (Development only)                       |

## Run locally

```powershell
dotnet run --project SampleExtension.Radiologists.Web.Ai
```

Available endpoints:

- Swagger UI: http://localhost:5080/
- Health: `/health/liveness`, `/health/readiness`

A `.http` file (`SampleExtension.Radiologists.Web.Ai.http`) is included for
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

The extension performs the AI-powered quality check using **Azure OpenAI**,
configured via the `OpenAI` section in `appsettings.json` (`Endpoint`, `ApiKey`,
and `DeploymentName`).

If Azure OpenAI is not configured, the extension responds with
`503 Service Unavailable` and a message naming the settings to populate — by
design, so a misconfigured deployment fails fast and visibly rather than
silently returning empty results.

> For an on-device alternative that needs no cloud account, see the
> [`SampleExtension.Radiologists.Web.Local`](../SampleExtension.Radiologists.Web.Local/README.md)
> sample (**Windows-only**).

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

For production, prefer **environment variables** or a secret store (e.g. Azure
Key Vault) over putting secrets in `appsettings.json`. Each `OpenAI` setting maps
to an environment variable via ASP.NET Core's `__` (double-underscore) convention:

```bash
OpenAI__Endpoint=https://<your-resource-name>.openai.azure.com/
OpenAI__ApiKey=<your-api-key>
OpenAI__DeploymentName=<your-deployment-name>
```

These are the same variables shown in the sample's `Dockerfile`.

## Request / response contract

See [`radiologists-extensibility-api.yaml`](../../../../radiologists-extensibility-api.yaml) for the full OpenAPI spec.

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
