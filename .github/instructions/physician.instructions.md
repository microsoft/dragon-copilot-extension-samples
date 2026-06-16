---
applyTo: 'physician/**'
---

# Physician Extension Samples — Copilot Instructions

> Physician owners own this file. Extend or refine it as your samples evolve.

## Sample layout

- C# sample: `physician/src/samples/DragonCopilot/Workflow/SampleExtension.Web/`
- Python sample: `physician/src/samples/DragonCopilot/Workflow/pythonSampleExtension/`
- Models project: `physician/src/models/Dragon.Copilot.Physician.Models/`
- OpenAPI contract: `physician/physician-extensibility-api.yaml`
- Quickstart guide: `physician/QUICKSTART.md`

## Stack facts

- C# sample targets **.NET 9.0**, ASP.NET Core Web API.
- Default dev ports: **5181** (HTTP), **7156** (HTTPS).
- Authentication is enabled by default in `appsettings.json` and can be toggled per environment.
- The C# sample includes a custom `LicenseKeyMiddleware` for subscription / feature-key validation in addition to JWT auth.

## Core data models

The Physician models project defines the canonical clinical types used by the extension contract. Key DTOs include:

- `DragonStandardPayload` — top-level payload carrying session data and clinical context
- `Note` — clinical notes and documentation
- `Transcript` — speech-to-text transcriptions
- `IterativeTranscript` / `IterativeAudio` — real-time streaming data
- `Patient` / `Practitioner` — healthcare entities
- `Encounter` — clinical visits and sessions
- `MedicalCode` — standardized medical coding (ICD, SNOMED, etc.)

## Service entry point

The Physician sample exposes its business logic through `IProcessingService` (see `Services/IProcessingService.cs`). To replace the stubbed extraction logic with your own, edit `Services/ProcessingService.cs` — this is the single integration point.

## Endpoint shape

```csharp
[ApiController]
[Route("v1")]
public class ProcessController : ControllerBase
{
    [HttpPost("process")]
    [Authorize(Policy = "RequiredClaims")]
    public async Task<ActionResult<ProcessResponse>> Process(
        [FromBody] DragonStandardPayload payload,
        CancellationToken cancellationToken = default)
}
```

## Authentication layers

Physician samples use two layers stacked on top of each other:

1. **JWT bearer authentication** via Microsoft Entra ID and Microsoft Identity Web.
2. **License key validation** via a custom middleware (`LicenseKeyMiddleware`) for business-level subscription and feature gating.

Both layers can be disabled in development through `appsettings.Development.json`.

## Manifest format (Physician)

```yaml
name: extension-name
description: Extension description
version: 0.0.1
auth:
  tenantId: 00000000-0000-0000-0000-000000000000
tools:
  - name: tool-name
    description: Tool description
    endpoint: https://api.example.com/v1/process
    trigger: AutoRun  # AutoRun (default) or AdaptiveCardAction
    inputs:
      - name: note
        description: Clinical note input
        content-type: application/vnd.ms-dragon.dsp.note+json
    outputs:
      - name: processed-data
        description: Processed results
        content-type: application/vnd.ms-dragon.dsp+json
```

## Local development workflow

1. `dotnet run --project physician/src/samples/DragonCopilot/Workflow/SampleExtension.Web`.
2. Open Swagger at `http://localhost:5181/`.
3. Health probes at `/health/liveness` and `/health/readiness`.
4. Use the bundled `.http` files in the sample folder for quick request testing.
