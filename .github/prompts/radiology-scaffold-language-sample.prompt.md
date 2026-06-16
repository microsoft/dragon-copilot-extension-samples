---
description: "Scaffold a Radiology extension sample in the language of your choice, mirroring the C# Quickstart."
mode: agent
---

# Scaffold a Radiology sample in another language

Generate a new Radiology extension sample, in the language the user provides, that implements the **same wire contract** as the C# Quickstart and can be checked into this repository once reviewed. Treat the rest of this file as your working instructions and reference material.

## Start here — establish the target language

Your first step is to confirm which language to scaffold:

1. If the user has already named a language (in their message or via the `${input:language}` variable below), use it and continue straight to scaffolding.
2. Otherwise, reply with a single short question asking the user to choose one of `python`, `go`, `java`, `nodejs`, `typescript`, `rust`, or another language they specify, then wait for their answer.

Keep that first reply to just the question. Begin reading the source material and scaffolding only once the language is known.

## How a partner uses this prompt

1. Open the repo in an editor with GitHub Copilot Chat enabled (for example Visual Studio or VS Code).
2. In Copilot Chat, type `/` and select `radiology-scaffold-language-sample`.
3. Provide the target language when asked (for example `python`, `go`, `java`, `nodejs`, `typescript`, `rust`).
4. Review, run, and adjust before committing.

## Input

- `${input:language:Target language for the new sample (e.g. python, go, java, nodejs, typescript, rust)}`

## Source material to read first

1. **`radiology/radiology-extensibility-api.yaml` is the canonical wire contract** for Radiology. It defines `POST /v1/process` with `ProcessRequest` as the request envelope and `ProcessResponse` as the response envelope, and contains the full schema definitions for all Radiology domain types. Read it first.
2. **The C# Quickstart shows the canonical implementation** of that contract. Read it end-to-end:
    - `radiology/src/samples/Workflow/SampleExtension.Radiology.Web.Quickstart/Controllers/QualityCheckController.cs`
    - `.../Services/IQualityCheckService.cs`, `.../Services/QualityCheckService.cs`
    - `.../MockData/qualitycheck-response.json` — canned response to reuse verbatim
    - `.../appsettings.json` — `Authentication` configuration shape
    - `.../Program.cs` — middleware order (CORS, Swagger-at-root in Development, health endpoints, auth)
    - `.../README.md` — README structure to mirror
    - `.../SampleExtension.Radiology.Web.Quickstart.http` — canonical sample payload (note: field casing mixes snake_case and camelCase per spec; reproduce it exactly)
3. **The shared models project** `radiology/src/models/Dragon.Copilot.Radiology.Models/` is where the wire envelope lives in C# (`ProcessRequest`, `ProcessResponse`, `SessionData`, `PatientInformation`, `Report`, `QualityCheckResult`, `Recommendation`, `Provenance`, `ReferenceResource`, `BiologicalSex`, `QualityCheckType`). The samples themselves do **not** have a `Models/` folder; mirror the types from this shared project.
4. Per-language overlay (load only if it exists for the chosen language): `.github/instructions/<language>-sample.instructions.md`. If present, follow it strictly.

## Wire contract (lock this down — non-negotiable)

This section reflects `radiology/radiology-extensibility-api.yaml` and the canonical `.http` payload exactly. **Do not rename fields, do not change casing.**

**`POST /v1/process`** request body (`ProcessRequest`):

    {
        "extensibilityApiVersion": "1.1.1",  // Optional, informational — Dragon Copilot may include this
        "sessionData": {                      // Required
            "correlation_id": "...",
            "session_start": "...",
            "environment_id": "..."
        },
        "patientInformation": {               // Optional
            "dateOfBirth": "YYYY-MM-DD",
            "biologicalSex": "Male|Female|Unknown|Other"
        },
        "report": { "reportText": "..." }     // Optional
    }

Response body (`ProcessResponse`):

    {
        "success": true,
        "message": "Payload processed successfully.",
        "payload": {
            // Map of output name -> QualityCheckResult.
            // The output name comes from the extension manifest; the C# Quickstart uses "qualityCheckResult".
            "qualityCheckResult": {
                "recommendations": [
                    /* Recommendation[] */
                ]
            }
        }
    }

Field casing is **mixed** and must be reproduced exactly:

- Top-level request: `extensibilityApiVersion` (camelCase, optional), `sessionData` / `patientInformation` / `report` (camelCase).
- Top-level response: `success` / `message` / `payload` (camelCase). **No version field on the response.**
- `SessionData` fields are **snake_case**: `correlation_id`, `session_start`, `environment_id`.
- `PatientInformation` and `Report` fields are **camelCase**: `dateOfBirth`, `biologicalSex`, `reportText`.
- `payload` on the response is a **map**, not a fixed object. The key (`qualityCheckResult` in the canned mock) is declared by the extension's `extension.yaml` `outputs[].name`.

Only `sessionData` is required on the request per the OpenAPI spec. `Recommendation`, `Provenance`, `ReferenceResource`, `BiologicalSex`, `QualityCheckType` mirror the shared `Dragon.Copilot.Radiology.Models` types exactly.

## Folder and naming conventions

Folder lives at `radiology/src/samples/Workflow/<folder-name>/`. The folder name **reads as** "sample extension radiology `<language>` quickstart" using the **language's idiomatic package-naming convention** (snake_case for Python/Rust, kebab-case for Node/TypeScript/Go/Java, dotted PascalCase for C#).

Use the same lowercase language token (`python`, `nodejs`, `typescript`, `go`, `java`, `rust`) consistently in code (namespaces, packages, module names) and README headings. Do not introduce a separate PascalCase variant.

## What the sample must do

### API surface

1. **Endpoint:** `POST /v1/process` accepting the request body above, returning the response body above. Bind to **HTTP port 5080** by default; document `--port` override in the README (5080 collides with the C# sample if both run on the same host).
2. **Health probes:** `GET /health/liveness` and `GET /health/readiness`, each returning a JSON body `{"status": "Healthy"}` on success (matching the C# samples, which write JSON from their health-check response writer).
3. **Domain types:** Mirror `Dragon.Copilot.Radiology.Models` in the target language. Internal code uses the language's idiomatic casing (snake_case in Python/Rust, exported PascalCase in Go, camelCase in Java/Kotlin/Node/TS). Wire JSON is **camelCase**; add a language-idiomatic alias/tag/annotation layer to map between the two (this is the same pattern C# uses with `[JsonPropertyName]`).

### Implementation

4. **Service layer:** A single `QualityCheckService` (or language equivalent) with one method that takes `ProcessRequest` and returns `ProcessResponse`. Use the language's idiomatic async pattern if the framework is async-first (the C# samples expose `ProcessAsync` with a cancellation token). The only logic is loading the canned mock data. Partners replace this method with their real implementation.
5. **Mock data:** Copy `radiology/src/samples/Workflow/SampleExtension.Radiology.Web.Quickstart/MockData/qualitycheck-response.json` **verbatim** to a top-level `MockData/` folder inside the new sample (match the C# layout — do not nest it under a source/package directory). Filename uses the language's idiomatic casing for resource files:
    - Python / Rust → `qualitycheck_response.json`
    - C# / Node / TypeScript → `qualitycheck-response.json`
    - Java → `qualityCheckResponse.json`
    - Go → `qualitycheckresponse.json`

### Security & configuration

6. **Authentication:** Implement **fully working** Microsoft Entra ID JWT bearer validation using a language-idiomatic, well-known library (agent picks the library and notes the choice in the README). Validation must check:
    - Signature against Entra ID JWKS for the configured tenant
    - Issuer matches `https://login.microsoftonline.com/<tenant>/v2.0` (or v1 equivalent)
    - Audience matches the configured client ID
    - At least one `azp` (or `appid`) claim is in the allowed-caller list

    **Toggle off by default** for local development via an `enabled` flag (mirrors the C# `Authentication.Enabled`). When off, all routes are anonymous. Use placeholders for tenant/client/allowed-caller IDs (`<YOUR_ENTRA_TENANT_ID>`, `<YOUR_APP_REGISTRATION_CLIENT_ID>`, `<ALLOWED_CALLER_CLIENT_ID>`). Never check in real values.

7. **Configuration:** Read settings from environment variables (prefix `DCR_RAD_`) with a language-idiomatic config layer. Match the keys in the C# `appsettings.json`'s `Authentication` section.

### Cross-cutting behaviour

8. **CORS:** Enable open CORS by default (mirrors the C# Program.cs); the README must include a warning that it must be locked down in production.
9. **Swagger / OpenAPI UI:** Wire `GET /` to redirect to the framework's OpenAPI UI only when that UI is bundled in the framework's standard distribution and requires no additional configuration, manual setup, or extra packages to display API documentation. Otherwise omit the redirect entirely. Do not add any package solely to provide an OpenAPI UI.
10. **Tracing headers:** Accept `x-ms-request-id` and `x-ms-correlation-id` if present, but do not validate, log, or echo them — match C#, which only logs `SessionData.correlationId` from the body.
11. **Error responses:** Use whatever the framework returns by default for 400/422/500. Do **not** add a custom error envelope.

### Files & docs

12. **`extension.yaml`:** Include a Radiology manifest at the sample root. **Radiology manifests differ from Physician manifests** — use this structure:

        name: sampleQualityCheckExtension          # camelCase, starts lowercase
        description: Sample radiology quality check extension
        version: 0.0.1
        radiologyExtensibilityApiVersion: 1.0.0    # Required for Radiology
        auth:
          tenantId: 00000000-0000-0000-0000-000000000000
        tools:
          - name: sampleQualityCheckTool
            toolType: contractBased                # Required for Radiology
            capability: qualityCheck               # Required for Radiology
            description: Tool to check quality of a radiology report
            endpoint: http://localhost:5080/v1/process
            inputs:
              - name: report
                description: Radiology report from Dragon Copilot
                content-type: application/vnd.ms-dragon.rad.report+json
                schemaVersion: "1.0"               # Required for Radiology
              - name: patientInformation
                description: Patient demographic information
                content-type: application/vnd.ms-dragon.rad.patient-information+json
                schemaVersion: "1.0"
            outputs:
              - name: qualityCheckResult
                description: Quality check findings and score
                content-type: application/vnd.ms-dragon.rad.quality-check-result+json
                schemaVersion: "1.0"

    See `tools/dragon-copilot-cli/src/schemas/radiology/radiology-extension-manifest-schema.json` for the full JSON Schema.

13. **README:** Mirror the structure of `radiology/src/samples/Workflow/SampleExtension.Radiology.Web.Quickstart/README.md`. Required sections: What's included, API endpoints (table), Run locally (separate Linux/macOS and Windows PowerShell blocks), Testing the API (with both `curl` and `Invoke-RestMethod` examples for `/v1/process` and both health probes), Security (with explicit Entra ID enable steps), Quality-check provider, Request/response contract. Add a Running the tests section as well (the C# samples ship no tests, but other-language samples do — see item 14).

### Validation

14. **Tests:** Ship a baseline test suite using the language's standard test framework. Required cases:
    - `/health/liveness` returns 200 + `{"status": "Healthy"}`
    - `/health/readiness` returns 200 when mock data is present
    - `/v1/process` happy path against the canonical sample payload returns the canned response (assert 3 recommendations, the `Clinical` + `Billing` types present, `severityScorePercent` 85 on the "paddock steatosis" recommendation)
    - `/v1/process` returns the framework's default validation error (typically 4xx) when required fields are missing
    - Auth toggle: enabled ⇒ unauthenticated request returns 401; enabled + valid bearer token ⇒ 200 (mock the JWKS / signing key in tests so this can run hermetically)
15. **Sample payload:** Use `radiology/src/samples/requests/FullRequest-Example.json` as the canonical complete request, or compose from fragments (`PatientInformationRequest-Example.json`, `ReportRequest-Example.json`). The body in `SampleExtension.Radiology.Web.Quickstart.http` is the canonical reference. All patient data must remain fictional.

## Hard rules

- Single dependency-install step + single run command. Document both in the README.
- No real Entra ID tenant IDs, client IDs, secrets, or PHI anywhere — including in tests and comments.
- Do not invent fields, headers, or status codes that are not in the C# Quickstart.
- Do not modify the C# Quickstart or any shared models.
- Do not update the workflow index README; the partner adds the row themselves.

## After generating

1. Print a short summary: folder structure, key files, dependency-install command, run command.
2. Install dependencies for the new sample using the language's standard tooling.
3. Run the new sample's test suite. **Do not** start a live server for smoke testing — tests are sufficient.
4. If install or tests fail, fix the generated code and re-run before reporting success.
5. List anything the partner should review before committing (framework / library choices, port collision with the C# sample, anything the prompt was silent on).
