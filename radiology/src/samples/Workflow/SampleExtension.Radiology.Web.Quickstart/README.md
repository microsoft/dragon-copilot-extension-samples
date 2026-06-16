# Partner Extension Sample — Quickstart

A minimal radiology extension for Dragon Copilot. It returns a canned
quality-check response loaded from a JSON file on disk. Use it as the
starting point for a new partner extension, replace the stubbed logic with
your own implementation and deploy a working extension that follows the expected contract.

## What's included

- ASP.NET Core Web API (.NET 10), single controller: `POST /v1/process`
- JWT authentication via Microsoft Entra ID, toggleable via `Authentication.Enabled` in `appsettings.json`
- Stubbed responses loaded from JSON files under `MockData/`
- Swagger UI at the app root in Development
- Health probes at `/health/liveness` and `/health/readiness` (JSON responses)

## API endpoints

| Method | Route                 | Auth        | Description                                            |
| ------ | --------------------- | ----------- | ----------------------------------------------------- |
| POST   | `/v1/process`         | JWT         | Analyzes a radiology report, returns quality checks   |
| GET    | `/health/liveness`    | Public      | Liveness probe, returns `{"status":"Healthy"}`        |
| GET    | `/health/readiness`   | Public      | Readiness probe, returns `{"status":"Healthy"}`       |
| GET    | `/`                   | Public      | Swagger UI (Development only)                          |

## Run locally

```powershell
dotnet run --project SampleExtension.Radiology.Web.Quickstart
```

Available endpoints:

- Swagger UI: http://localhost:5080/
- Health: `/health/liveness`, `/health/readiness`

A `.http` file (`SampleExtension.Radiology.Web.Quickstart.http`) is included
for sending sample requests from Visual Studio or VS Code.

## Testing the API

Use the included `.http` file, or call the endpoints directly.

**Health probes:**

```bash
curl http://localhost:5080/health/liveness
curl http://localhost:5080/health/readiness
```

```powershell
Invoke-RestMethod http://localhost:5080/health/liveness
Invoke-RestMethod http://localhost:5080/health/readiness
```

**Process a report** (see [`SampleExtension.Radiology.Web.Quickstart.http`](./SampleExtension.Radiology.Web.Quickstart.http) for the full body). The relative path below assumes you are in the `radiology/src/samples/Workflow` directory (the same place you ran `dotnet run` from):

```bash
curl -X POST http://localhost:5080/v1/process \
  -H "Content-Type: application/json" \
  -d '@../requests/FullRequest-Example.json'
```

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5080/v1/process `
  -ContentType "application/json" `
  -InFile ..\requests\FullRequest-Example.json
```

## Security

The application validates JWT bearer tokens on all routes except health probes.
Authentication is configurable via `appsettings.json`.

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

This Quickstart sample always returns the canned response in
[`MockData/qualitycheck-response.json`](./MockData/qualitycheck-response.json).
Partners can edit the JSON directly to tweak the stubbed output without
modifying any C# code.

To replace the stub with real logic, edit
[`Services/QualityCheckService.cs`](./Services/QualityCheckService.cs) — the
`IQualityCheckService.ProcessAsync` method is the single integration point.

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
