---
applyTo: "radiologists/**"
---

# Radiologists Extension Samples — Copilot Instructions

Radiologists extensions come in two directions, and every tool declares which one it is via `toolType`:

- **`contractBased`** — Dragon Copilot calls the partner's `POST /v1/process` endpoint and waits. Used for quality checks on a radiology report.
- **`partnerInitiated`** — the partner generates a result on their own schedule and posts it to the Dragon Copilot Radiologists API. Used for pre-draft report generation. Nothing calls the partner, so these tools declare no `endpoint` and no `inputs`.

A single manifest may declare tools of both types. Most of this file describes `contractBased`; sections that only apply to one type say so.

## Authoritative contract

- **OpenAPI spec (`contractBased`):** `radiologists/extensibility-api/radiologists-extensibility-api.yaml` is the canonical wire contract for `POST /v1/process`. It defines the envelope as `ProcessRequest` (request) and `ProcessResponse` (response), and contains the full schema definitions for all Radiologists domain types (`SessionData`, `PatientInformation`, `Report`, `QualityCheckResult`, `Recommendation`, `Provenance`, `ReferenceResource`).
- **JSON Schemas (`partnerInitiated`):** `radiologists/partner-initiated/` holds `pre-draft-report-ingest-request-schema.json` (the request body) and `pre-draft-report-schema.json` (the report itself, carried as `draftReport`), plus a worked example of each under `samples/`.
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

| Variant    | Folder                                             | Purpose                                                                                                                        | Target    | Platform       |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | -------------- |
| Quickstart | `PreDraftReport.Console.QuickStart/` | Console app that checks a pre-draft report payload offline and prints the JSON body that would be posted. The call itself is in `submit-pre-draft-report.http`. | `net10.0` | Cross-platform |

Each samples folder has its own `extension.yaml` declaring only the tools that folder implements. `radiologists/manifest/extension.yaml` is the reference manifest showing every field and both tool types; it is not wired to a sample.

## Stack facts

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

- `PreDraftReportIngestRequest` — the request body; identifies the extension and carries `draftReport`
- `PreDraftReport` — the report itself
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
POST api/v1/tenants/{tenantId}/environments/{environmentId}/draft-report-ai-results
Authorization: Bearer {token}
```

The token needs the `AiFindingsWriter` app permission; without it the call returns `403` even though the token is valid.

Two response codes need care:

- **`404`** — either no order matches `draftReport.imagingStudy.accessionNumber`, or no installed tool matches `manifestName` plus `toolName`.
- **`409`** — either `draftReport.identifier` was already submitted, which means the report is **already stored** and a retry should be treated as success, or the accession number matched more than one order, which is unresolvable.

So `identifier` must be stable across retries of one run and unique across runs. `publisherId`, `offerId` and `planId` are all-or-nothing; side-loaded extensions omit all three. `manifestName` is always required.

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
            content-type: application/vnd.ms-dragon.rad.pre-draft-report+json
            schemaVersion: "1.0"
      relevanceFilteringCriteria: # Declarative only; not currently enforced
          relevantBodyParts:
              - CHEST
          relevantModalities:
              - CT
```

See `tools/dragon-copilot-cli/src/schemas/radiologists/radiologists-extension-manifest-schema.json` for the full JSON Schema.

## Scaffolding a sample in another language

A Python sample already ships at `radiologists/src/samples/ContractBased/sample_extension_radiologists_python_quickstart/`. When a partner wants a Radiologists sample in another language (for example Go, Java, or Node.js), invoke the reusable Copilot prompt at `.github/prompts/radiologists-scaffold-language-sample.prompt.md`. Its usage instructions live inside the prompt file itself. It currently scaffolds `contractBased` samples only.
