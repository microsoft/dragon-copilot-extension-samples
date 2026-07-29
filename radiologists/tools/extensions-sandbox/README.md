# Microsoft Dragon Copilot (radiologists) Extensions Sandbox

A local development environment for testing and validating Microsoft Dragon Copilot (radiologists) extensions before deployment to customer sites.

**Why this exists**: validating a manifest and its payloads currently requires deploying to a real Dragon Copilot environment. The sandbox runs that loop locally — load a manifest, point it at your extension, and see the manifest, request, and response payloads validated against the Extensibility API contract before you ship.

**Who it's for**: partners building radiology extensions.

**Where it fits**: author your manifest with `tools/dragon-copilot-cli`, run your extension (or one of the samples in `radiologists/src/samples/Workflow`), then load the manifest here to test.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- npm >= 9.x

## Quick Start

```bash
# 1. Navigate to the sandbox directory
cd radiologists/tools/extensions-sandbox

# 2. Install dependencies
npm install

# 3. Build both client and server
npm run build

# 4. Start the production server
npm start
```

The server will be available at `http://localhost:4000`.

## Development

For local development with hot-reload:

```bash
npm run dev
```

This starts both the frontend (Vite dev server on port 3000) and backend (Express on port 4000) concurrently. The frontend proxies API calls to the backend automatically.

Open `http://localhost:3000` in your browser.

### Server logging

The Express server emits scoped, leveled logs through a shared logger (`server/src/utils/logger.ts`). Each entry is tagged with a scope identifying the area (e.g. `http`, `manifest`, `extension-call`, `validate`, `auth`, `validation`).

**Level** is controlled by the `LOG_LEVEL` environment variable (`debug` | `info` | `warn` | `error`), defaulting to `info`:

```bash
# Windows (PowerShell)
$env:LOG_LEVEL = "debug"; npm run dev

# macOS / Linux
LOG_LEVEL=debug npm run dev
```

- `info` (default) shows request flow, outbound extension calls, and validation outcomes.
- `debug` additionally surfaces verbose dumps such as raw request bodies and a reproducible `curl` command for each outbound call.

**Format** is controlled by the `LOG_FORMAT` environment variable (`pretty` | `json`). It defaults to `pretty` in development and `json` in production (`NODE_ENV=production`):

- `pretty` — human-readable lines, e.g. `[sandbox-server] [manifest] 2026-06-25T... Validating manifest...`
- `json` — one structured object per line, suitable for machine parsing / log aggregation, e.g. `{"time":"2026-06-25T...","level":"info","scope":"manifest","msg":"Validating manifest..."}`

```bash
# Force structured JSON output in development
LOG_FORMAT=json npm run dev
```

**Secrets are never logged.** Bearer tokens / `Authorization` headers are redacted, and client secrets never reach the logs; only non-sensitive metadata (tenant id, client id, scope, expiry) may appear.

## Project Structure

```
extensions-sandbox/
├── package.json          # Root workspace configuration
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx      # Application entry point
│   │   ├── App.tsx       # Root component
│   │   └── App.css       # Global styles
│   ├── index.html        # HTML template
│   ├── vite.config.ts    # Vite configuration with API proxy
│   └── tsconfig.json     # TypeScript configuration
└── server/               # Express backend
    ├── scripts/
    │   ├── generate-output-schemas.ts  # Generates JSON Schemas from OpenAPI spec
    │   └── sync-cli-schemas.ts         # Syncs the manifest schema from the CLI source
    ├── src/
    │   ├── index.ts      # Server entry point
    │   ├── schemas/
    │   │   ├── radiologists/           # Source-of-truth schemas (see note below)
    │   │   │   ├── radiologists-extension-manifest-schema.json
    │   │   │   └── radiologists-extensibility-api.yaml
    │   │   ├── generated-schemas/      # Auto-generated (do not edit by hand)
    │   │   │   └── quality-check-result.json
    │   │   └── manifest.schema.ts      # TypeScript types for manifests
    │   ├── routes/
    │   │   └── manifest.ts
    │   ├── services/
    │   │   └── validation.ts
    │   ├── utils/
    │   │   └── schema-path.ts          # Central path resolution for schemas
    │   └── __tests__/
    │       └── fixtures/               # Test resource files
    └── tsconfig.json     # TypeScript configuration
```

### Generated Schemas

The `server/src/schemas/generated-schemas/` folder contains JSON Schema files that are **auto-generated** from the OpenAPI specification (`radiologists-extensibility-api.yaml`). These files should not be edited by hand — they are regenerated on every build and test run via:

```bash
npm run generate-schemas
```

The generation script (`scripts/generate-output-schemas.ts`) extracts schema definitions (e.g., `QualityCheckResult`, `Recommendation`, `Provenance`) from the OpenAPI YAML and produces standalone JSON Schema files used for response validation.

> **Note:** The manifest schema (`radiologists-extension-manifest-schema.json`) is owned by the
> `tools/dragon-copilot-cli` package and synced into `src/schemas/radiologists/` at dev/build/test
> time by `scripts/sync-cli-schemas.ts` (the local copy is git-ignored — the CLI is the single
> source of truth). The OpenAPI spec (`radiologists-extensibility-api.yaml`) is still a local copy
> from `diag-radex-extension-service` and will be replaced with an internal package reference once
> the service publishes its authoritative version.

## API Endpoints

| Method | Path          | Description          |
|--------|---------------|----------------------|
| GET    | /api/health   | Server health check  |
| GET    | /api/auth/config | Get auth config (secret redacted) |
| POST   | /api/auth/config | Update auth config (secret write-only) |
| POST   | /api/auth/test   | Acquire a token and validate claims (no extension call) |

## Architecture

- **Frontend**: React 19 with Vite for fast HMR during development
- **Backend**: Express 5 with TypeScript
- **Communication**: Frontend proxies `/api/*` requests to the backend server
- **Build**: npm workspaces for unified dependency management

## Testing against a sample extension

Rather than shipping its own throwaway extension service, the sandbox is meant to be pointed at the canonical **Quickstart sample extension** that lives alongside these samples: [`SampleExtension.Radiologists.Web.Quickstart`](../../src/samples/Workflow/README.md). It implements the same `ProcessRequest`/`ProcessResponse` envelope contract from the Extensibility API for Dragon Copilot (radiologists) and returns a schema-valid `QualityCheckResult` payload, so you can exercise the sandbox UI end-to-end without deploying a real extension.

### Start the sample extension

```bash
# From the repository root
cd radiologists/src/samples/Workflow
dotnet run --project SampleExtension.Radiologists.Web.Quickstart
```

The service listens on `http://localhost:5080` (https `https://localhost:7080`) and exposes its processing endpoint at `POST /v1/process`.

### Run it from the sandbox

1. Start the sample extension (port `5080`, above).
2. Start the sandbox (`npm run dev` from `extensions-sandbox/`).
3. Load the shared manifest [`extension.yaml`](../../src/samples/Workflow/extension.yaml) — its `sampleQualityCheckTool` already targets `http://localhost:5080/v1/process`, so there is nothing to edit.
4. Switch to the **Setup** tab, fill in the report inputs, and click **Run**.
5. View results in the **Results** and **Outputs** tabs.

### Example Response

The Quickstart returns a canned `QualityCheckResult` (source: `SampleExtension.Radiologists.Web.Quickstart/MockData/qualitycheck-response.json`):

```json
{
  "success": true,
  "message": "Payload processed successfully.",
  "payload": {
    "qualityCheckResult": {
      "recommendations": [
        {
          "qualityCheckType": "Clinical",
          "description": "Replace 'paddock steatosis' with 'hepatic steatosis'.",
          "reason": "'Paddock steatosis' is a well-known speech-to-text mis-hearing of 'hepatic steatosis' (fatty liver); leaving the erroneous term in the report can mislead downstream clinicians and break automated coding.",
          "severityScorePercent": 85,
          "provenance": [
            { "text": "paddock steatosis", "startPosition": 42, "endPosition": 59 }
          ]
        }
      ]
    }
  }
}
```

## Authentication

The sandbox can authenticate calls to your extension endpoint using **Microsoft Entra ID service-to-service (client credentials)** authentication, mirroring the Dragon Copilot Extension Runtime-to-Extension authentication scheme. When enabled, the sandbox backend acquires an OAuth 2.0 access token and attaches it as a `Bearer` token on every tool execution.

### One-time setup (in the partner tenant)

1. **Service principal for the Dragon Copilot Extension Runtime** — create a service principal for the Dragon Copilot Extension Runtime (client id `d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8`) in your tenant:
   ```powershell
   New-MgServicePrincipal -AppId d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8
   ```
2. **Extension app registration** — create a single-tenant app registration for your extension with an Application ID URI of the form `api://{partner_tenant_id}/{FQDN_of_extension_endpoint}` and set `requestedAccessTokenVersion: 2` in its manifest.
3. **Client secret** — create a client secret for the calling app (the Dragon Copilot Extension Runtime, or your own app registered as the caller).

### Configuring in the sandbox

In the **Setup** tab, open **Authentication → Configure**:

| Field | Description |
|-------|-------------|
| **Authenticate calls** | Toggle service-to-service auth on/off. Off = unauthenticated calls (for local testing). |
| **Tenant ID** | The Entra tenant that issues the token (your partner tenant). |
| **Client ID** | The calling app's client id (defaults to the Dragon Copilot Extension Runtime client id). |
| **Client Secret** | Stored **in memory on the server only**; never returned to the UI or logged. |
| **Application ID URI / Scope** | Your extension's Application ID URI. A bare URI is fine — `/.default` is appended automatically. |

Click **Save**, then **Test connection** to acquire a token without calling the extension. The result shows the token expiry and a claims-validation summary.

### How it works

1. The backend requests a token via the client credentials grant:
   ```http
   POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=client_credentials
   &client_id=d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8
   &client_secret=<secret>
   &scope=api://{tenantId}/ext.contoso.com/.default
   ```
2. Tokens are **cached** until shortly before expiry (60s skew) to avoid unnecessary requests.
3. The token is sent to your endpoint as `Authorization: Bearer <token>`.
4. Your extension should validate these JWT claims: `iss`, `idtyp` (must be `app`), and `azp` (must equal the Dragon Copilot Extension Runtime client id `d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8`). The sandbox surfaces these as pass/fail guidance in the test results.

### Security notes

- The client secret is held **in server memory only** — it is never persisted to disk, returned by `GET /api/auth/config`, or written to logs.
- Auth can be toggled off at any time to test unauthenticated endpoints.
- See [Microsoft Entra JWT claims validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation) for details on validating tokens in your extension.

### Offline end-to-end testing (no Azure)

To exercise the full **authentication-enabled** flow without a real Entra tenant, set the `ENTRA_TOKEN_ENDPOINT` environment variable so the sandbox acquires tokens from a local fake issuer instead of `login.microsoftonline.com`. The value may include a `{tenantId}` placeholder.

1. Start a fake token issuer that returns a JWT-shaped `access_token`. The token's `iss` and `tid` must use the **same tenant GUID** you enter in the UI, otherwise the `iss` claim check cannot be verified locally:
   ```powershell
   node -e "const c={iss:'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',idtyp:'app',azp:'d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8',tid:'11111111-1111-1111-1111-111111111111'};const t=['e30',Buffer.from(JSON.stringify(c)).toString('base64url'),'sig'].join('.');require('http').createServer((q,r)=>{r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({access_token:t,expires_in:3600,token_type:'Bearer'}))}).listen(9200,()=>console.log('fake issuer on :9200'))"
   ```
2. Start the sandbox (server **and** client) pointed at the fake issuer:
   ```powershell
   $env:ENTRA_TOKEN_ENDPOINT = "http://localhost:9200/token"
   npm run dev
   ```
3. In the UI, enable authentication and configure it with **Tenant ID** `11111111-1111-1111-1111-111111111111` (the GUID baked into the fake token above), the Dragon Copilot Extension Runtime client id as **Client ID**, any non-empty **Client Secret**, and a scope. Click **Test connection** — you'll get a token and all three claim checks (`iss` / `idtyp` / `azp`) green, entirely offline. Run a test against a [sample extension](#testing-against-a-sample-extension) to verify the end-to-end enabled-auth path.

> `ENTRA_TOKEN_ENDPOINT` is for local testing only. Leave it unset in any real environment so tokens are acquired from Microsoft Entra ID.

### Testing the authentication feature

Five layers, from zero-setup to full end-to-end. Ports: client `:3000`, sandbox server `:4000`, echo listener `:9100`.

**1. Automated tests (no setup)** — fastest regression check. The auth suites mock the token endpoint and cover acquisition, caching, expiry refresh, error mapping, claim checks, and secret-never-leaked:
```powershell
npm run clean --workspaces --if-present
npm test --workspace=server
```

**2. Config & secret handling (no Azure)** — start the app (`npm run dev`), then verify the write-only secret contract:
```powershell
# Save config with a secret:
curl.exe -s -X POST http://localhost:4000/api/auth/config -H "Content-Type: application/json" `
  --data '{"enabled":true,"tenantId":"tid","clientSecret":"my-secret","scope":"api://tid/ext.contoso.com"}'

# GET must show hasSecret:true but NEVER the secret value:
curl.exe -s http://localhost:4000/api/auth/config
```
Confirm the GET response contains no `clientSecret`, and that saving other fields with an empty secret keeps `hasSecret:true`.

**3. Error paths (no Azure)** — click **Test connection** (or `POST /api/auth/test`) with bad input:
- Missing fields → `invalid_config` with guidance.
- Fake tenant/secret → Entra returns `invalid_client` / `invalid_scope`, surfaced as a clear error. No extension call is made on auth failure.

**4. Real token acquisition (needs an Entra app)** — with a real tenant, app registration, and client secret (per [One-time setup](#one-time-setup-in-the-partner-tenant)), click **Test connection** → expect **Token acquired**, an expiry time, and green `iss` / `idtyp` / `azp` claim checks.

**5. End-to-end — confirm the Bearer reaches the extension.**

*No Azure (forwarding seam):* the `/execute` proxy still forwards a body-supplied `bearerToken` when auth is disabled. Start an echo listener and call `/execute` directly:
```powershell
# Echo listener on :9100 that prints the Authorization header and returns a valid envelope:
node -e "require('http').createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{console.log('AUTH:',q.headers.authorization);r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({success:true,message:'ok',payload:{'quality-result':{recommendations:[]}}}))})}).listen(9100)"

# Set the manifest tool endpoint to http://localhost:9100/v1/process, then:
curl.exe -s -X POST http://localhost:4000/api/manifest/execute -H "Content-Type: application/json" `
  --data '{"capability":"qualityCheck","tool":"chestCtQuality","inputs":{"report":"..."},"bearerToken":"test-token-123"}'
```
The listener prints `AUTH: Bearer test-token-123`, proving the token is attached on the wire.

*Fully offline with auth ON:* mint a token from a local fake issuer via the `ENTRA_TOKEN_ENDPOINT` override (see [Offline end-to-end testing](#offline-end-to-end-testing-no-azure) for details), then run a test against the echo/mock endpoint to exercise the entire enabled-auth path without Azure:
```powershell
# 1. Fake token issuer on :9200 returning a JWT-shaped access_token with valid claims
#    (iss + tid use the same tenant GUID you'll enter in the UI):
node -e "const c={iss:'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',idtyp:'app',azp:'d9350f5d-71c2-46b9-b41d-3c5d51ffe6e8',tid:'11111111-1111-1111-1111-111111111111'};const t=['e30',Buffer.from(JSON.stringify(c)).toString('base64url'),'sig'].join('.');require('http').createServer((q,r)=>{r.writeHead(200,{'Content-Type':'application/json'});r.end(JSON.stringify({access_token:t,expires_in:3600,token_type:'Bearer'}))}).listen(9200,()=>console.log('fake issuer on :9200'))"

# 2. Point the sandbox (server + client) at the fake issuer and start it:
$env:ENTRA_TOKEN_ENDPOINT = "http://localhost:9200/token"
npm run dev
```
Then enable authentication in the UI with **Tenant ID** `11111111-1111-1111-1111-111111111111` (the GUID baked into the fake token), click **Test connection** (all three claim checks green, no Azure), and run a tool test against the echo listener above to confirm the full enabled-auth path end-to-end. Leave `ENTRA_TOKEN_ENDPOINT` unset in any real environment.

## Upcoming Features

- Dragon Copilot preview pane for extension results
- Sample scenario picker & sample data packs
- Dragon Copilot CLI integration with the manifest editor
