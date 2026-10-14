---
applyTo: "radiologists/**"
---

# Radiologists Extension Samples — Copilot Instructions

Radiologists extension tools support two interaction patterns, identified by `toolType`: Dragon Copilot can call the Partner, or the Partner can call Dragon Copilot.

- **`contractBased`** — Dragon Copilot calls the Partner's `POST /v1/process` endpoint and waits for the tool output in the response. Used for quality checks on radiology reports.
- **`partnerInitiated`** — The Partner generates a result on its own schedule and submits it to the Dragon Copilot Radiologists API. Used for pre-draft report generation. Dragon Copilot does not call the Partner for these tools, so they declare no `endpoint` or `inputs`.

A single manifest may declare tools of both types. Most of this document describes `contractBased`; sections that apply to only one type say so.

## Authoritative contract

- **OpenAPI spec (`contractBased`):** `radiologists/extensibility-api/radiologists-extensibility-api.yaml` is the canonical wire contract for `POST /v1/process`. It defines the envelope as `ProcessRequest` (request) and `ProcessResponse` (response), and contains the full schema definitions for all Radiologists domain types (`SessionData`, `PatientInformation`, `Report`, `QualityCheckResult`, `Recommendation`, `Provenance`, `ReferenceResource`).
- **JSON Schemas (`partnerInitiated`):** `radiologists/partner-initiated/` holds `draft-report-ingest-request-schema.json` (the request body) and `draft-report-schema.json` (the report itself, carried as `draftReport`). `samples/` holds an example submission (`PreDraftReportGeneration-Ingest-Request-Example.json`) and an example of what Dragon Copilot returns when the result is later retrieved (`PreDraftReportGeneration-Retrieve-Response-Example.json`).
- **Models project:** `radiologists/src/models/Dragon.Copilot.Radiologists.Models/` — C# classes mirroring both contracts, split into `ContractBased/` and `PartnerInitiated/` subfolders. Both share the namespace `Dragon.Copilot.Radiologists.Models`. The wire types live **here**, not in each sample.
- **Wire shape (from the spec):**
    - Request `ProcessRequest`: required `sessionData`; optional `extensibilityApiVersion` (string, e.g. `"1.1.1"`, informational metadata from Dragon Copilot), `patientInformation`, and `report`. Additional named inputs flow through `additionalProperties`. The Radiologists C# model declares `patientInformation` and `report` as explicit properties for convenience.
    - Response `ProcessResponse`: optional `success`, `message`, and `payload` — a **map** of output name → `QualityCheckResult` (the output name comes from the extension's manifest, e.g. `qualityCheckResult`).
- **Field casing on the wire is mixed**, matching the YAML: top-level uses camelCase (`extensibilityApiVersion`, `sessionData`, `patientInformation`, `report`); `SessionData` fields are snake_case (`correlation_id`, `session_start`, `environment_id`); `PatientInformation` and `Report` fields are camelCase (`dateOfBirth`, `biologicalSex`, `reportText`).

## Sample variants

Three C# `contractBased` variants live under `radiologists/src/samples/ContractBased/`:

| Variant       | Folder                                         | Purpose                                                                                                                           | Target                      | Platform       |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------- |
| Quickstart    | `SampleExtension.Radiologists.Web.Quickstart/` | Returns a canned response from `MockData/qualitycheck-response.json`. The fastest way to get a working extension running locally. | `net10.0`                   | Cross-platform |
| Ai            | `SampleExtension.Radiologists.Web.Ai/`         | Calls **Azure OpenAI** when the `OpenAI` config is populated; otherwise returns a `503` "not configured" error.                   | `net10.0`                   | Cross-platform |
| Foundry Local | `SampleExtension.Radiologists.Web.Local/`      | Runs an on-device model via **Foundry Local** (`Microsoft.AI.Foundry.Local.WinML`); no cloud account or API key needed.           | `net10.0-windows10.0.26100` | Windows-only   |

One `partnerInitiated` variant lives under `radiologists/src/samples/PartnerInitiated/`:

| Variant    | Folder                               | Purpose                                                                                                                                 | Target    | Platform       |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------- |
| Quickstart | `PreDraftReport.Console.QuickStart/` | Console app that submits a pre-draft report the way a Partner's service does, to a simulated Dragon Copilot endpoint in `Simulation/`. | `net10.0` | Cross-platform |

Each samples folder has its own `extension.yaml` declaring only the tools that folder implements. `radiologists/manifest/extension.yaml` is the reference manifest showing every field and both tool types; it is not wired to a sample.

For `partnerInitiated` work, use the contract in `radiologists/partner-initiated/` (`README.md`, the schemas, the example payloads in `samples/` and `authentication.md`) and the `PartnerInitiated/` models. The console sample's `Simulation/` folder mirrors the real submission endpoint: its validation rules, the order in which it resolves the environment, extension, tool, stored identifier and order, and its status codes, `reason` values and response bodies. Keep it in step with `radiologists/partner-initiated/README.md` when either changes. It deliberately simplifies authentication and only checks that a bearer token is present.

## Stack facts (`contractBased` samples)

- C# target framework: `net10.0` (Quickstart and Ai, cross-platform), `net10.0-windows10.0.26100` (Foundry Local, due to the Foundry Local dependency).
- Default dev ports: **5080** (HTTP), **7080** (HTTPS).
- `Authentication.Enabled` is `false` by default in `appsettings.json` so partners can clone and run without setting up Entra ID first.
- Health probes at `/health/liveness` and `/health/readiness`, returning a JSON body (e.g. `{"status":"Healthy"}`) via a health-check response writer.
- Swagger UI is served at the application root in Development.

## Domain types

Defined in `Dragon.Copilot.Radiologists.Models`.

`ContractBased/`:

- `Report` — the radiology report text and metadata
- `PatientInformation` — patient demographics relevant to the report
- `QualityCheckResult` — the structured result returned to Dragon Copilot
- `Recommendation` — an individual quality-check finding
- `Provenance` — the span of report text a recommendation was derived from (`text`, `startPosition`, `endPosition`)
- `ReferenceResource` — supporting references attached to a recommendation
- `BiologicalSex` — the patient's biological sex enum (`Male`, `Female`, `Unknown`, `Other`)
- `QualityCheckType` — the quality-check category enum (`Billing`, `Clinical`)

`PartnerInitiated/`:

- `DraftReportIngestRequest` — the request body; identifies the extension and carries `draftReport`
- `DraftReport` — the report itself
- `AISystemInfo` — the AI system that generated the report
- `ImagingStudy`, `Series`, `ImagingStudyPrior` — the study the report was generated from, and its priors
- `ReportContent`, `StructuredReport`, `Section`, `Code` — the report body
- `QualityMetrics` — confidence scores for the generated report

Collection properties on the `PartnerInitiated/` types use `Collection<T>` with a `CA2227` suppression, because `AnalysisLevel` is `latest-All` with `CodeAnalysisTreatWarningsAsErrors`. Follow that pattern when adding new ones.

## Quality-check service (`contractBased`)

All sample variants use `IQualityCheckService.ProcessAsync` (async with `CancellationToken`) as the single integration point. Replace its implementation to wire in your own logic.

- **Quickstart variant** (`net10.0`, cross-platform): Returns the canned response in `MockData/qualitycheck-response.json`. Partners can edit the JSON directly to tweak the stubbed output without rebuilding (the file is copied to the build output with `PreserveNewest`).
- **Ai variant** (`net10.0`, cross-platform): Calls **Azure OpenAI** when the `OpenAI` section in `appsettings.json` has `Endpoint`, `ApiKey`, and `DeploymentName` populated; otherwise returns `503 Service Unavailable` with a clear "not configured" message.
- **Foundry Local variant** (`net10.0-windows`, **Windows-only**): Runs an on-device model via **Foundry Local** (`Microsoft.AI.Foundry.Local.WinML`). No cloud account or API key is required — all inference is local.

    **Graceful fallback:** If the model returns malformed JSON or omits the expected `qualityCheckResult` property, the Ai and Foundry Local services log a warning and return a well-formed `ProcessResponse` with an empty recommendations list instead of throwing. Partners adapting these samples can replace this fallback with their own error-handling strategy.

    The full AI system prompt lives in code as the private `SystemPrompt` const in the Ai and Foundry Local samples' `Services/QualityCheckService.cs`, so it stays in sync with the running code.

## Endpoint shape (`contractBased`)

All three `contractBased` samples use an async controller action with `CancellationToken`:

```csharp
[ApiController]
[Route("v1")]
[Produces("application/json")]
[Authorize(Policy = "RequiredClaims")]
public sealed class QualityCheckController : ControllerBase
{
    [HttpPost("process")]
    public async Task<ActionResult<ProcessResponse>> PostAsync(
        [FromBody] ProcessRequest payload,
        CancellationToken cancellationToken) { ... }
}
```

## Submission shape (`partnerInitiated`)

The partner posts to the Dragon Copilot Radiologists API. The route carries the **customer's** tenant and environment; the partner's own identity comes from the access token, so it never appears in the body.

```http
POST {baseUrl}/api/v1/tenants/{customerTenantId}/environments/{environmentId}/draft-report-ai-results
Authorization: Bearer {token}
```

The token must be issued by the tenant in the manifest's `auth.tenantId`; a token from any other tenant does not match the extension. The partner app registration, permission and token acquisition are covered in `radiologists/partner-initiated/authentication.md`. The shared `doc/` authentication guides cover requests Dragon Copilot sends to an extension endpoint and don't apply here.

Two response codes need care. Both carry a machine-readable `reason`, and the `message` is the same for every response with that status, so branch on `reason`:

- **`404`** — `OrderNotFound` (no order matches `draftReport.imagingStudy.accessionNumber`), `ToolNotFound` (the manifest declares no `partnerInitiated` tool named `toolName` with the `preDraftReportGeneration` capability), `ExtensionNotFound` or `EnvironmentNotFound`.
- **`409`** — `ResultAlreadyStored` (`draftReport.identifier` was already submitted, which means the report is **already stored** and a retry should be treated as success), `MultipleOrdersMatched` (the accession number matched more than one order, which is unresolvable) or `MultipleExtensionsMatched`.

So `identifier` must be stable across retries of one run and unique across runs. `publisherId`, `offerId` and `planId` are all-or-nothing and recommended for extensions offered through Microsoft Marketplace; an extension installed as a custom app has none, so omit them. `manifestName` is always required. The full contract, including every `reason`, is in `radiologists/partner-initiated/README.md`.

## Manifest format (Radiologists)

Radiologists extension manifests differ from Physicians manifests. Key required fields:

```yaml
name: sampleQualityCheckExtension # camelCase, starts lowercase
description: Extension to provide radiology report quality checking
version: 0.0.1 # Partner's own version (x.y.z)
radiologistsExtensibilityApiVersion: 1.0.0 # API version from radiologists-extensibility-api.yaml
auth:
    tenantId: 00000000-0000-0000-0000-000000000000
tools:
    - name: sampleQualityCheckTool # camelCase, starts lowercase
      toolType: contractBased # Required for Radiologists
      capability: qualityCheck # Required for Radiologists
      description: Tool to check quality of a radiology report
      endpoint: https://publisher.example.com/quality-check
      inputs:
          - name: report
            description: Radiology report from Dragon Copilot
            content-type: application/vnd.ms-dragon.rad.report+json
            schemaVersion: "1.0" # Required: version of Report schema accepted
          - name: patientInformation
            description: Patient demographic information from Dragon Copilot
            content-type: application/vnd.ms-dragon.rad.patient-information+json
            schemaVersion: "1.0" # Required: version of PatientInformation schema accepted
      outputs:
          - name: qualityCheckResult
            description: Quality check findings and score
            content-type: application/vnd.ms-dragon.rad.quality-check-result+json
            schemaVersion: "1.0" # Required: version of QualityCheckResult schema produced
```

A `partnerInitiated` tool declares no `endpoint` and no `inputs`, only what it produces:

```yaml
tools:
    - name: preDraftReportGeneratorTool
      toolType: partnerInitiated
      capability: preDraftReportGeneration
      description: Tool to generate a pre-draft radiology report
      outputs:
          - name: preDraftReportResult
            description: Pre-draft radiology report
            content-type: application/vnd.ms-dragon.rad.draft-report+json
            schemaVersion: "1.0"
      relevanceFilteringCriteria: # Declarative only; not currently enforced
          relevantBodyParts:
              - CHEST
          relevantModalities:
              - CT
```

See `tools/dragon-copilot-cli/src/schemas/radiologists/radiologists-extension-manifest-schema.json` for the full JSON Schema.

## Scaffolding a sample in another language

A Python sample already ships at `radiologists/src/samples/ContractBased/sample_extension_radiologists_python_quickstart/`. When a partner wants a Radiologists sample in another language (for example Go, Java, or Node.js), invoke the reusable Copilot prompt at `.github/prompts/radiologists-scaffold-language-sample.prompt.md`. Its usage instructions live inside the prompt file itself. It scaffolds `contractBased` samples only. For a `partnerInitiated` sample, which submits a pre-draft report to Dragon Copilot, invoke `.github/prompts/radiologists-scaffold-partner-initiated-sample.prompt.md` instead.
