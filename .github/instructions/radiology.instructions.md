---
applyTo: "radiology/**"
---

# Radiology Extension Samples — Copilot Instructions

Radiology extensions analyze radiology reports and return quality-check recommendations.

## Authoritative contract

- **OpenAPI spec:** `radiology/radiology-extensibility-api.yaml` is the canonical wire contract for `POST /v1/process`. It defines the envelope as `ProcessRequest` (request) and `ProcessResponse` (response), and contains the full schema definitions for all Radiology domain types (`SessionData`, `PatientInformation`, `Report`, `QualityCheckResult`, `Recommendation`, `Provenance`, `ReferenceResource`).
- **Models project:** `radiology/src/models/Dragon.Copilot.Radiology.Models/` — C# classes that mirror the OpenAPI spec (`ProcessRequest`, `ProcessResponse`, `SessionData`, `PatientInformation`, `Report`, `QualityCheckResult`, …). The wire envelope lives **here**, not in each sample.
- **Wire shape (from the spec):**
    - Request `ProcessRequest`: required `sessionData`; optional `extensibilityApiVersion` (string, e.g. `"1.1.1"`, informational metadata from Dragon Copilot), `patientInformation`, and `report`. Additional named inputs flow through `additionalProperties`. The Radiology C# model declares `patientInformation` and `report` as explicit properties for convenience.
    - Response `ProcessResponse`: optional `success`, `message`, and `payload` — a **map** of output name → `QualityCheckResult` (the output name comes from the extension's manifest, e.g. `qualityCheckResult`).
- **Field casing on the wire is mixed**, matching the YAML: top-level uses camelCase (`extensibilityApiVersion`, `sessionData`, `patientInformation`, `report`); `SessionData` fields are snake_case (`correlation_id`, `session_start`, `environment_id`); `PatientInformation` and `Report` fields are camelCase (`dateOfBirth`, `biologicalSex`, `reportText`).

## Sample variants

Two C# sample variants live under `radiology/src/samples/Workflow/`:

| Variant    | Folder                                      | Purpose                                                                                                                                           | Target                          | Platform                     |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------- |
| Quickstart | `SampleExtension.Radiology.Web.Quickstart/` | Returns a canned response from `MockData/qualitycheck-response.json`. The fastest way to get a working extension running locally.                 | `net10.0`                       | Cross-platform               |
| Ai         | `SampleExtension.Radiology.Web.Ai/`         | Calls Azure OpenAI when its config is populated; otherwise calls Foundry Local on-device inference when enabled. Throws if neither is configured. | `net10.0-windows10.0.26100`     | Windows-only (Foundry Local) |

## Stack facts

- C# target framework: `net10.0` (Quickstart), `net10.0-windows10.0.26100` (AI sample, due to Foundry Local dependency).
- Default dev ports: **5080** (HTTP), **7080** (HTTPS).
- `Authentication.Enabled` is `false` by default in `appsettings.json` so partners can clone and run without setting up Entra ID first.
- Health probes at `/health/liveness` and `/health/readiness`, returning a JSON body (e.g. `{"status":"Healthy"}`) via a health-check response writer.
- Swagger UI is served at the application root in Development.

## Domain types

Defined in `Dragon.Copilot.Radiology.Models`:

- `Report` — the radiology report text and metadata
- `PatientInformation` — patient demographics relevant to the report
- `QualityCheckResult` — the structured result returned to Dragon Copilot
- `Recommendation` — an individual quality-check finding
- `Provenance` — the span of report text a recommendation was derived from (`text`, `startPosition`, `endPosition`)
- `ReferenceResource` — supporting references attached to a recommendation
- `BiologicalSex`, `QualityCheckType` — enums (`Billing`, `Clinical`)

## Quality-check service

Both sample variants use `IQualityCheckService.ProcessAsync` (async with `CancellationToken`) as the single integration point. Replace its implementation to wire in your own logic.

- **Quickstart variant:** Returns the canned response in `MockData/qualitycheck-response.json`. Partners can edit the JSON directly to tweak the stubbed output without rebuilding (the file is copied to the build output with `PreserveNewest`).
- **Ai variant:** Selects a provider per request from configuration:
    1. **Azure OpenAI** when the `OpenAI` section in `appsettings.json` has `Endpoint`, `ApiKey`, and `DeploymentName` populated.
    2. Otherwise **Foundry Local** when `FoundryLocal:Enabled` is `true`.

    **Graceful fallback:** If the model returns malformed JSON or omits the expected `qualityCheckResult` property, the service logs a warning and returns a well-formed `ProcessResponse` with an empty recommendations list instead of throwing. Partners adapting this sample can replace this fallback with their own error-handling strategy.

    The full AI system prompt lives in code at `SampleExtension.Radiology.Web.Ai/Services/QualityCheckService.cs` as the private `SystemPrompt` const, so it stays in sync with the running code.

## Endpoint shape

Both samples use an async controller action with `CancellationToken`:

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

## Manifest format (Radiology)

Radiology extension manifests differ from Physician manifests. Key required fields:

```yaml
name: sampleQualityCheckExtension          # camelCase, starts lowercase
description: Extension to provide radiology report quality checking
version: 0.0.1                             # Partner's own version (x.y.z)
radiologyExtensibilityApiVersion: 1.0.0    # API version from radiology-extensibility-api.yaml
auth:
  tenantId: 00000000-0000-0000-0000-000000000000
tools:
  - name: sampleQualityCheckTool           # camelCase, starts lowercase
    toolType: contractBased                # Required for Radiology
    capability: qualityCheck               # Required for Radiology
    description: Tool to check quality of a radiology report
    endpoint: https://publisher.example.com/quality-check
    inputs:
      - name: report
        description: Radiology report from Dragon Copilot
        content-type: application/vnd.ms-dragon.rad.report+json
        schemaVersion: "1.0"               # Required: version of Report schema accepted
      - name: patientInformation
        description: Patient demographic information from Dragon Copilot
        content-type: application/vnd.ms-dragon.rad.patient-information+json
        schemaVersion: "1.0"               # Required: version of PatientInformation schema accepted
    outputs:
      - name: qualityCheckResult
        description: Quality check findings and score
        content-type: application/vnd.ms-dragon.rad.quality-check-result+json
        schemaVersion: "1.0"               # Required: version of QualityCheckResult schema produced
```

See `tools/dragon-copilot-cli/src/schemas/radiology/radiology-extension-manifest-schema.json` for the full JSON Schema.

## Scaffolding a sample in another language

When a partner wants a Radiology sample in a language other than C# (for example Python, Go, Java, or Node.js), invoke the reusable Copilot prompt at `.github/prompts/radiology-scaffold-language-sample.prompt.md`. Its usage instructions live inside the prompt file itself.
