# Partner Extension Sample — Foundry Local (on-device, Windows-only)

A radiologists extension for Dragon Copilot that performs **AI-powered** quality
checks using an **on-device model via [Foundry Local](https://learn.microsoft.com/azure/ai-foundry/foundry-local/)**
— no cloud account or API key required. Inference runs locally through
`Microsoft.AI.Foundry.Local.WinML` (Windows ML).

> ⚠️ **Windows-only.** This sample targets `net10.0-windows10.0.26100` / `win-x64`
> because of the `Microsoft.AI.Foundry.Local.WinML` dependency. For a
> **cross-platform** real-model sample (Windows, Linux, macOS), use the
> [`SampleExtension.Radiologists.Web.Ai`](../SampleExtension.Radiologists.Web.Ai/README.md)
> sample, which uses Azure OpenAI.

Use it as the starting point for partners that want to explore on-device inference;
copy the project and replace the prompt and result handling with your own
implementation to run a contract-compliant quality check entirely on local hardware.

## What's included

- ASP.NET Core Web API (.NET 10, **Windows-only**), single controller: `POST /v1/process`
- JWT authentication via Microsoft Entra ID, toggleable via `Authentication.Enabled` in `appsettings.json`
- AI-powered quality checks via an **on-device Foundry Local model** (`Microsoft.AI.Foundry.Local.WinML`)
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

## Run locally (Windows)

```powershell
dotnet run --project SampleExtension.Radiologists.Web.Local
```

On the first request the configured model is downloaded and loaded, which can take
several minutes; subsequent requests reuse the loaded model.

Available endpoints:

- Swagger UI: http://localhost:5080/
- Health: `/health/liveness`, `/health/readiness`

A `.http` file (`SampleExtension.Radiologists.Web.Local.http`) is included for
sending sample requests from Visual Studio or VS Code.

## Foundry Local provider

The extension runs the quality check on an on-device model via Foundry Local,
configured in the `FoundryLocal` section of `appsettings.json`:

| Setting      | Description                                                                    |
| ------------ | ------------------------------------------------------------------------------ |
| `ModelAlias` | Foundry Local model to download and load (e.g. `qwen2.5-1.5b`).                |
| `DeviceType` | Inference device: `CPU` (default), `GPU`, or `NPU`.                            |
| `AppName`    | Application name passed to Foundry Local (used for log/data directory naming). |
| `AppDataDir` | Model cache + logs location. Empty defaults to `%USERPROFILE%\.foundry`.       |

No cloud account, endpoint, or API key is required — all inference is local.

## Security

The application validates JWT bearer tokens on all routes except health probes and
Swagger UI. Authentication is configurable via `appsettings.json` and is **disabled
by default** for local development. See [`appsettings.json`](./appsettings.json) for
the full schema and inline comments, and enable it for production by setting
`Authentication.Enabled` to `true` and populating `TenantId`, `ClientId`, and
`RequiredClaims.azp`.
