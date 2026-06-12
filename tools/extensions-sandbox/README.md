# Dragon Copilot Extensions Sandbox

A local development environment for testing and validating Dragon Copilot extensions before deployment to customer sites.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- npm >= 9.x

## Quick Start

```bash
# 1. Navigate to the sandbox directory
cd tools/extensions-sandbox

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
    │   └── mock-extension-server.ts    # Dummy extension service for sandbox testing
    ├── src/
    │   ├── index.ts      # Server entry point
    │   ├── schemas/
    │   │   ├── radiology/              # Source-of-truth schemas (see note below)
    │   │   │   ├── radiology-extension-manifest-schema.json
    │   │   │   └── radiology-extensibility-api.yaml
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

The `server/src/schemas/generated-schemas/` folder contains JSON Schema files that are **auto-generated** from the OpenAPI specification (`radiology-extensibility-api.yaml`). These files should not be edited by hand — they are regenerated on every build and test run via:

```bash
npm run generate-schemas
```

The generation script (`scripts/generate-output-schemas.ts`) extracts schema definitions (e.g., `QualityCheckResult`, `Recommendation`, `Provenance`) from the OpenAPI YAML and produces standalone JSON Schema files used for response validation.

> **Note:** The radiology schemas in `src/schemas/radiology/` are temporarily copied from
> `diag-radex-extension-service` and will be replaced with internal package references once
> those are in sync with the service's authoritative versions.

## API Endpoints

| Method | Path          | Description          |
|--------|---------------|----------------------|
| GET    | /api/health   | Server health check  |

## Architecture

- **Frontend**: React 19 with Vite for fast HMR during development
- **Backend**: Express 5 with TypeScript
- **Communication**: Frontend proxies `/api/*` requests to the backend server
- **Build**: npm workspaces for unified dependency management

## Mock Extension Server

The sandbox ships with a **mock extension server** that simulates a real Dragon Copilot Radiology extension. It implements the `ExtensionRequest`/`ExtensionResponse` envelope contract from the Radiology Extensibility API and responds with valid `QualityCheckResult` payloads — making it useful for end-to-end testing of the sandbox UI without deploying a real extension.

### What It Does

The mock server exposes a single processing endpoint (`POST /v1/process`) that handles two tools matching the test fixture manifests in `server/src/__tests__/fixtures/`:

| Tool Name | Manifest Fixture | Behaviour |
|-----------|-----------------|-----------|
| `chestCtQuality` | `valid-manifest-simple.json` | Analyses chest CT report text and returns Clinical/Billing recommendations (checks for comparison section, impression, bilateral procedures) |
| `brainMriQuality` | `valid-manifest-full-featured.json` | Analyses brain MRI report text and returns Clinical recommendations (checks for DWI mention, ventricular assessment) |

Both tools return schema-valid responses that pass the sandbox's built-in response validation.

### Starting the Mock Server

```bash
# From the extensions-sandbox directory
cd server
npx tsx scripts/mock-extension-server.ts

# Or with a custom port (default: 9100)
npx tsx scripts/mock-extension-server.ts --port 8080
```

The server starts at `http://localhost:9100` and prints available endpoints.

### Using with the Sandbox

1. Start the mock server (port 9100)
2. Start the sandbox (`npm run dev` from `extensions-sandbox/`)
3. Upload one of the test manifests from `server/src/__tests__/fixtures/`
4. **Edit the endpoint** in the manifest to `http://localhost:9100/v1/process`
5. Switch to the **Setup** tab, fill in inputs, and click **Run**
6. View results in the **Results** and **Outputs** tabs

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/process` | Main processing endpoint (accepts `ExtensionRequest`, returns `ExtensionResponse`) |
| `GET` | `/health` | Health check — returns `{ status, tools }` |

### Example Request

```bash
curl -X POST http://localhost:9100/v1/process \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-123",
    "customerTenantId": "00000000-0000-0000-0000-000000000000",
    "tools": [{
      "toolName": "chestCtQuality",
      "toolRequestId": "tr-1",
      "inputs": {
        "report": {
          "reportText": "Chest CT shows bilateral ground-glass opacities. No pleural effusion."
        }
      }
    }]
  }'
```

### Example Response

```json
{
  "requestId": "test-123",
  "tools": [{
    "toolName": "chestCtQuality",
    "toolRequestId": "tr-1",
    "outputs": {
      "quality-result": {
        "recommendations": [
          {
            "qualityCheckType": "Clinical",
            "description": "Missing comparison with prior studies",
            "reason": "No comparison section found in report.",
            "severityScorePercent": 55
          },
          {
            "qualityCheckType": "Billing",
            "description": "Missing CPT modifier for bilateral procedure",
            "reason": "Bilateral finding described but modifier -50 not referenced.",
            "severityScorePercent": 75
          }
        ]
      }
    }
  }]
}
```

## Next Steps

The sandbox will support the following workflows (upcoming features):
- Upload & validate extension manifests
- Browse capabilities and tools from manifests
- Execute tools with custom inputs against local endpoints
- Validate responses against expected schemas
- Generate consolidated test reports
