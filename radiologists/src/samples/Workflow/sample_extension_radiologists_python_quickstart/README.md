# Partner Extension Sample — Radiologists Quickstart (Python)

A minimal radiologists extension for Dragon Copilot, written in **Python** with
**FastAPI**. It returns a canned quality-check response loaded from a JSON file
on disk. Use it as the starting point for a new partner extension: replace the
stubbed logic with your own implementation and deploy a working extension that
follows the expected contract.

This sample implements the **same wire contract** as the
[C# Quickstart](../SampleExtension.Radiologists.Web.Quickstart/README.md).

## What's included

- FastAPI app (Python 3.12), single endpoint: `POST /v1/process`
- JWT authentication via Microsoft Entra ID (using [PyJWT](https://pyjwt.readthedocs.io/)),
  toggleable via the `DCR_RAD_AUTHENTICATION__ENABLED` setting (off by default)
- Stubbed responses loaded from JSON files under `MockData/`
- Swagger UI at the app root (`/` redirects to FastAPI's built-in `/docs`)
- Health probes at `/health/liveness` and `/health/readiness` (JSON responses)
- A `pytest` test suite under `app/tests/`

## API endpoints

| Method | Route               | Auth   | Description                                         |
| ------ | ------------------- | ------ | --------------------------------------------------- |
| POST   | `/v1/process`       | JWT    | Analyzes a radiology report, returns quality checks |
| GET    | `/health/liveness`  | Public | Liveness probe, returns `{"status":"Healthy"}`      |
| GET    | `/health/readiness` | Public | Readiness probe, returns `{"status":"Healthy"}`     |
| GET    | `/`                 | Public | Swagger UI (redirects to `/docs`)                   |

## Run locally

The service binds to **HTTP port 5080** by default. Override the port by
changing the `--port` value in the run command. (Port 5080 collides with the C#
Radiologists sample, so don't run both on the same host without changing one.)

### Linux / macOS

```bash
python3.12 -m venv .venv && source .venv/bin/activate && python3.12 -m pip install --upgrade pip && python3.12 -m pip install -r requirements.txt
python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 5080 --reload
```

### Windows (PowerShell)

```powershell
python3.12 -m venv .venv
. .\.venv\Scripts\Activate.ps1
python3.12 -m pip install --upgrade pip
python3.12 -m pip install -r requirements.txt
python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 5080 --reload
```

Available endpoints:

- Swagger UI: http://localhost:5080/ (redirects to `/docs`)
- Health: `/health/liveness`, `/health/readiness`

## Testing the API

### Health probes

```bash
curl http://localhost:5080/health/liveness
curl http://localhost:5080/health/readiness
```

```powershell
Invoke-RestMethod http://localhost:5080/health/liveness
Invoke-RestMethod http://localhost:5080/health/readiness
```

### Process a report

The relative path below assumes you are in the
`radiologists/src/samples/Workflow` directory.

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

## Running the tests

From the sample root (`sample_extension_radiologists_python_quickstart`), after
installing dependencies:

```bash
python3.12 -m pytest
```

```powershell
python3.12 -m pytest
```

The suite covers the health probes, the `/v1/process` happy path against the
canonical sample payload, the framework's default validation error for missing
required fields, and the authentication toggle (401 when enabled without a
token; 200 with a valid bearer token, verified hermetically with a locally
generated signing key).

## Security

The application validates JWT bearer tokens on `/v1/process` when
authentication is enabled. Health probes are always public.

> **CORS:** This sample enables fully open CORS for easy local testing. **Lock
> this down to specific origins, methods, and headers before deploying to
> production.**

### JWT Authentication (Microsoft Entra ID)

When enabled, every request to `/v1/process` must carry a valid Bearer token
issued by the configured Entra ID tenant. The token is validated for:

- **Signature** against the tenant's Entra ID JWKS keys
- **Issuer** matching `https://login.microsoftonline.com/<tenant>/v2.0`
  (the v1.0 `https://sts.windows.net/<tenant>/` issuer is also accepted)
- **Audience** matching the configured client ID
- At least one `azp` / `appid` claim in the allowed-caller list

Requests with a missing, expired, or invalid token receive **401 Unauthorized**.

This sample uses **[PyJWT](https://pyjwt.readthedocs.io/)** (with the `crypto`
extra) for signature validation and JWKS key resolution.

### Configuration

Settings are read from environment variables prefixed with `DCR_RAD_` (and an
optional `.env` file). Nested keys use a double-underscore delimiter. These
mirror the `Authentication` section of the C# sample's `appsettings.json`.

| Environment variable                           | Description                            |
| ---------------------------------------------- | -------------------------------------- |
| `DCR_RAD_AUTHENTICATION__ENABLED`              | Enable or disable authentication       |
| `DCR_RAD_AUTHENTICATION__TENANT_ID`            | Your Entra ID tenant ID                |
| `DCR_RAD_AUTHENTICATION__CLIENT_ID`            | Your app registration's client ID      |
| `DCR_RAD_AUTHENTICATION__INSTANCE`             | Login endpoint                         |
| `DCR_RAD_AUTHENTICATION__REQUIRED_CLAIMS__AZP` | Allowed caller client IDs (JSON array) |

See [`.env.example`](./.env.example) for a template.

### Local development

Authentication is **disabled by default** so the API can be called without
tokens. When disabled, all routes are anonymous.

### Enabling security for production

1. Register an application in [Microsoft Entra ID](https://entra.microsoft.com/).
2. Set the following (for example in a local, untracked `.env`):

    ```bash
    DCR_RAD_AUTHENTICATION__ENABLED=true
    DCR_RAD_AUTHENTICATION__TENANT_ID=<YOUR_ENTRA_TENANT_ID>
    DCR_RAD_AUTHENTICATION__CLIENT_ID=<YOUR_APP_REGISTRATION_CLIENT_ID>
    DCR_RAD_AUTHENTICATION__REQUIRED_CLAIMS__AZP=["<ALLOWED_CALLER_CLIENT_ID>"]
    ```

Once enabled, callers must include the bearer token on every request:

```
Authorization: Bearer <entra-id-jwt>
```

> Never commit real tenant IDs, client IDs, or secrets.

## Quality check provider

This Quickstart sample always returns the canned response in
[`MockData/qualitycheck_response.json`](./MockData/qualitycheck_response.json).
Edit the JSON directly to tweak the stubbed output without changing any Python
code.

To replace the stub with real logic, edit
[`app/service.py`](./app/service.py) — the
`QualityCheckService.process_async` method is the single integration point.

## Request / response contract

See [`radiologists-extensibility-api.yaml`](../../../radiologists-extensibility-api.yaml)
for the full OpenAPI spec.

Only `sessionData` is required. `extensibilityApiVersion` shows which Dragon
Copilot API version sent the request, and your extension does not need to read
it. Extra fields are accepted, so your extension keeps working as the API
evolves.

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
