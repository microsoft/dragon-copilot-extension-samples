
# Extensions Manifest for Dragon Copilot for Radiology

This page discusses the proposal for the Extensions Manifest (DCR-Manifest) that is to be used with 'Dragon Copilot for Radiology' (DCR). DCR enables integrations with Partners who provide their own APIs that extend the capabilities offered by DCR. DCR-Manifest defines the schema that Partner APIs must support to successfully integrate with DCR.

# Background
- **Partner:** A Partner provides an Extension that is to be integrated with Dragon Copilots for use by Customers. A Partner hosts the API that implements and provides the functionality of their Extension.
- **Customer:** A Customer purchases a License for an Extension from a Partner that enables the use of Dragon Copilots to invoke the Partner's Extension.
- **User:** A User is a person in the Customer's organization (like a Physician or Radiologist) who uses a Dragon Copilot to invoke a Partner's Extension and view its results.
- **Dragon Copilot:** Dragon Copilot (DC) is the platform that enables various Copilots within Microsoft's Health & Life Sciences. Within DC, we have Dragon Copilot for Physician (DCP) and Dragon Copilot for Radiology (DCR). The Dragon Copilot platform connects Customers with Partners to enable Users to leverage Extensions through Dragon Copilots. DCP leverages its extensions manifest (DCP-Manifest) which enables Partner integrations for DCP. Similarly, DCR will leverage its extension manifest (DCR-Manifest) to enable partner integrations for DCR.

## Onboarding discussion with Dragon Copilot team
After meeting with the Dragon Copilot Extensions SDK team (Brandon Pollett, Stuti Kumar, Namrat Acharya) on 2026-03-10, we (The Rad Mavericks team), learned that we may propose a DCR-Manifest by making relevant changes in the `dragon-copilot-extension-samples` repo (by submitting a pull-request) and by reaching out to the Dragon team to have them review and approve that change. Afterwards, the Dragon team will work with us to enable the integration/onboarding of our DCR-Manifest with the relevant systems in Dragon Admin Center (DAC) to enable potential side-loading of compatible DCR Extensions. In the long term, we may also work with them to enable integration/onboarding of our DCR-Manifest with the relevant systems in Partner Center.


# Dragon Copilot for Physician - Extensions

Dragon Copilot for Physician - Extensions (DCP-Extensions) are already defined and supported by the files in the `dragon-copilot-extension-samples` and `hls-dax-core-docs` repos:

- **[`extension-manifest.json`](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/tools/dragon-copilot-cli/src/schemas/extension-manifest.json)**:
  Schema that enables validation of all DCP-Extensions manifests from all Partners. Used by the [`dragon-copilot-cli`](https://github.com/microsoft/dragon-copilot-extension-samples/tree/main/tools/dragon-copilot-cli), which also lives in this repo.
- **[`extension.yaml`](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/samples/DragonCopilot/Workflow/SampleExtension.Web/extension.yaml)**:
  Sample DCP-Extension manifest from a single Partner.
- **[`dragon-extensibility-api.yaml`](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/dragon-extensibility-api.yaml)**:
  OpenAPI spec defining the API contract (POST /v1/process) that a DCP-Extension must implement at its endpoint.
- **[`recipe-schema.yaml`](https://dev.azure.com/msazuredev/Healthcare/_git/hls-dax-core-docs?path=/openapi/workflow/recipe-schema.yaml)**:
  Defines the Recipe schema for when the extension manifest gets translated into a Recipe with tools, inputs, tasks.
- **[`workflow-api.yaml`](https://dev.azure.com/msazuredev/Healthcare/_git/hls-dax-core-docs?path=/openapi/workflow/workflow-api.yaml)**:
  Defines the Platform API that accepts a recipe, stores/retrieves artifacts and orchestrates execution.
- **[`note-payload.json`](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/samples/requests/note-payload.json)**:
  Sample request body (Note variant of DragonStandardPayload) showing what the platform sends to an extension's /v1/process endpoint.

## DCP-Extension Validation and API Contract

DCP-Extensions use a multi-layer approach to validate extension manifests and define the API contract between the platform and partner extensions.

### Manifest validation pipeline

Manifest validation is **CLI-first**. The `dragon-copilot-cli` is the primary validation authority:

| Stage | What's checked | Mechanism |
|---|---|---|
| **CLI — JSON Schema** | Structure, types, required fields, allowed content-type values, name/version patterns | AJV 8 (JSON Schema Draft-07) |
| **CLI — Business rules** | Duplicate tool names, duplicate server-authentication issuers | Custom programmatic checks |
| **Partner Center (frontend)** | File type (.zip), version format (user-entered field) | Minimal UI validation — manifest content is not inspected |
| **Control plane (backend)** | Malware scan (ESRP), package structure verification | `VerifyExtensionCallback` runs ESRP scan and Core Services verification post-upload. `ValidatePayloadCallback` exists but is a stub (`// TODO: Implement actual validation`) — manifest content is not inspected. |
| **Runtime** | Auth (JWT/Bearer), HTTP status codes | MISE middleware validates tokens/claims/RBAC; platform checks extension response HTTP status. No payload-schema validation — extension response bodies are not checked against ProcessResponse/DSP schema. |

The CLI is the only stage that inspects manifest content. Partner Center treats the ZIP as an opaque blob. The control plane runs malware scanning and package verification post-upload, but its manifest content validation is not yet implemented. At runtime, authentication and authorization are enforced, but payload schemas are not validated.

### API contract and payload structure

Each content-type string in the manifest (e.g., `application/vnd.ms-dragon.dsp.note+json`) implies a specific payload structure. This structure is defined across three layers:

| Layer | File | Role |
|---|---|---|
| **OpenAPI spec** (formal contract) | `dragon-extensibility-api.yaml` | Defines the `DragonStandardPayload` envelope and each payload variant (Note, Transcript, etc.) as OpenAPI schemas |
| **Reference models** (implementation) | `Dragon.Copilot.Models/` (Note.cs, etc.) | C# classes partners can use to deserialize payloads |
| **Sample payloads** (examples) | `samples/requests/note-payload.json`, etc. | Concrete JSON that partners can test against |

The `DragonStandardPayload` envelope always contains `sessionData` plus one variant:

```
Request (platform → extension):
  DragonStandardPayload
  ├── sessionData (always present)
  └── one of (input payload, determined by content-type):
      ├── note                   ← dsp.note+json
      │   ├── payload_version, schema_version, language
      │   ├── encounter (patient, practitioner, date)
      │   ├── document (title, type with codes)
      │   └── resources: [ ClinicalDocumentSection, ... ]
      │       e.g., "HPI: The patient presents for evaluation of right knee pain..."
      ├── transcript             ← dsp.transcript+json
      ├── iterativeTranscript    ← dsp.iterative-transcript+json
      └── iterativeAudio         ← dsp.iterative-audio+json

Response (extension → platform):
  ProcessResponse
  └── payload (map of named outputs)
      └── DSP
          ├── schema_version
          └── resources (results produced by the extension):
              ClinicalDocumentSection | MedicalCode | ObservationConcept | ...
```

### How the platform enforces correctness

There is no runtime payload-schema validation. Instead, correctness relies on typed code and shared contracts:

- **Outbound (platform → extension):** The platform's artifact preparation layer uses the content-type declared in the manifest to select the corresponding typed model class (e.g., `dsp.note+json` → `Note.cs`). It then constructs the payload by populating that model. Correctness is guaranteed **by construction** — the content-type drives which model is built, and the compiler enforces that the model is well-formed.
- **Inbound (extension → platform):** Extension responses are stored as-is. If a partner returns malformed JSON, the failure surfaces downstream when consumers (UI, other tools) attempt to deserialize it.
- **Partner-side:** Partners who generate code from the OpenAPI spec or use the reference C# models get type-safe deserialization, which serves as soft enforcement on their side.

In short, the OpenAPI spec and reference models are the shared contract — both sides compile against them, and the compiler is the enforcer. Content-type values are explicitly validated against an allowed list at CLI time. At runtime, the platform uses the content-type to select the corresponding typed model, so the content-type also implicitly drives payload correctness through construction.


# Dragon Copilot for Radiology - Extensions

Dragon Copilot for Radiology - Extensions (DCR-Extensions) will also be defined and supported by the files in the `dragon-copilot-extension-samples` and `hls-dax-core-docs` repos. Similarly, DCR-Extensions will build-upon the patterns of DCP-Extensions:

- **`radiology-extension-manifest-schema.json`**:
  Schema that enables validation of all DCR-Extensions manifests from all Partners. Extends the DCP schema with DCR-specific features (appId, toolType, capability, input config with min/max priors, required flag, Push trigger, relevanceFilteringCriteria, configurationTemplate, DICOM modality and body part enums).
- **`dcr-extension.yaml`**:
  Sample DCR-Extension manifest from a single Partner.
- **`dcr-dragon-extensibility-api.yaml`**:
  OpenAPI spec defining the API contract that a DCR-Extension must implement at its endpoint. Defines the POST /v1/process endpoint, request/response envelopes (DragonStandardPayload, ProcessResponse), and payload schemas for RadiologyReport (dsp.rad.report+json) and RadiologyQualityResult (dsp.rad.quality-result+json). Shared schemas (Encounter, Patient, Practitioner, etc.) are kept compatible with the DCP spec (`dragon-extensibility-api.yaml`). (The DCP and DCR specs can be combined into a single unified spec if needed).

Note: The `dcr-` prefix on files above is only meant to disambiguate them from the similar files in DCP-Extensions. All names are temporary — we will pick better names as the files move into the `dragon-copilot-extension-samples` repo.

### Status labels
We use the following status labels to define progress for items in this document:

- **Defined** — schema/spec exists in a file and is validated by a sample, but subject to review and refinement
- **Draft** — initial schema/spec written but incomplete or not yet validated
- **Planned** — not yet started

## DCR-Extension Validation and API Contract

DCR-Extensions follows the same validation and correctness pattern as DCP-Extensions (see "DCP-Extension Validation and API Contract" above).

The `DragonStandardPayload` envelope for DCR-Extensions follows the same pattern as DCP-Extensions — `sessionData` plus content-type-specific payloads:

```
Request (platform → extension):
  DragonStandardPayload
  ├── sessionData (always present)
  └── one or more named inputs (determined by content-type declared in manifest):
      ├── patientPriors          ← dsp.rad.report+json
      │   └── RadiologyReport
      │       ├── payload_version, schema_version, language
      │       ├── encounter (patient, practitioner, ordering_physician)
      │       └── reports: [ Report, ... ]
      │           ├── studyInformation (accessionNumber, modality, bodyParts, ...)
      │           ├── reportContent
      │           │   └── structuredReport
      │           │       └── sections: { indication, technique, comparison,
      │           │                        findings, impression, recommendation, ... }
      │           ├── structuredFindings (optional, for AI vendors)
      │           └── qualityMetrics (optional)
      ├── physicianPriors        ← dsp.rad.report+json (same schema)
      └── dictatedReport         ← dsp.rad.dictation+json (to be defined)

Response (extension → platform):
  ProcessResponse
  └── payload (map of named outputs)
      └── DSP
          ├── schema_version
          └── resources:
              RadiologyReport | RadiologyQualityResult
                                  └── recommendations: [ QualityRecommendation, ... ]
                                      ├── qualityCheckType, description, reason
                                      ├── severityScorePercent
                                      ├── provenance (text spans)
                                      └── referenceResources
```

### DCR-Extensions deliverables

- **Manifest schema** [Defined] — `dcr-extension-manifest.json`
- **Sample manifest** [Defined] — `dcr-extension.yaml`
- **OpenAPI spec** [Draft] — Equivalent of `dragon-extensibility-api.yaml` for DCR. Defines the API endpoint, request envelope, and payload schemas for each DCR content-type:
  - [Draft] `RadiologyReport` for `dsp.rad.report+json` — uses a dictionary of named sections for report body, aligned with the Extensions team's DraftReportDto/StructuredReportDto pattern. Includes study information, structured report sections, structured findings (optional, for AI vendors), quality metrics, and prior study references.
  - [Planned] `RadiologyDictation` for `dsp.rad.dictation+json` — placeholder, to be defined.
  - [Draft] `RadiologyQualityResult` for `dsp.rad.quality-result+json` — contains recommendations with quality check type, severity, provenance (text spans), and reference resources. Aligned with the Extensions team's QualityCheckResultDto/RecommendationDto pattern.
- **Sample payloads** [Planned] — Concrete JSON files (e.g., `rad-report-payload.json`, `rad-dictation-payload.json`, `rad-quality-result-payload.json`) that partners can test against.
- **Reference models** [Planned] — C# classes (or equivalent) that partners can use to deserialize DCR payloads (e.g., `RadiologyReport.cs`, `RadiologyDictation.cs`, `RadiologyQualityResult.cs`).
- **Sample extension** [Planned] — A working DCR extension implementation in the `dragon-copilot-extension-samples` repo (alongside the existing DCP sample). Demonstrates end-to-end how to receive a `RadiologyReport` via `dsp.rad.report+json`, perform a mock quality check, and return a `RadiologyQualityResult` via `dsp.rad.quality-result+json`. Uses the reference models and ships with sample payloads.
- **CLI support** [Planned] — Extend the existing `dragon-copilot-cli` to also validate DCR manifests. DCR-specific business rules to consider:
  - Duplicate tool names (same as DCP)
  - Tools with `capability: reportGeneration` should output `dsp.rad.report+json`
  - Tools with `capability: qualityCheck` should output `dsp.rad.quality-result+json`
  - Tools with `trigger: Push` may not need an endpoint URL
  - `toolType`-specific required fields (e.g., `endpoint` required for `contractBased` but potentially not for other types)
  - `maxNumberOfPriors` should be >= `minNumberOfPriors` when both are specified
- **Artifact preparation** [Planned] — The DCR platform needs server-side code that sources radiology data (patient priors, physician priors, dictation) from systems like DDMS, packages it into the payload schemas defined in the OpenAPI spec (e.g., `RadiologyReport`), and stores it as workflow artifacts. This is the equivalent of DCP's artifact preparation layer that builds `Note` and `Transcript` payloads.
- **Required/optional field review** [Planned] — The current required/optional designations on payload schemas (RadiologyReport, RadiologyQualityResult, and their sub-types) are initial proposals. These should be re-reviewed as real partner integrations begin, particularly: which fields the platform can reliably populate for priors (e.g., accessionNumber availability from older systems), which fields partners actually produce (e.g., sectionOrder), and whether quality metric fields should have minimum cardinality constraints. Edge cases around the Push trigger model (where the partner initiates) vs. AutoRun (where the platform initiates) may also surface different required-field needs.

## Desired Features in DCR-Extensions

- **[Defined]** Partners can decide which inputs are required (`required` flag on inputs)
- **[Defined]** Push trigger model (`trigger: Push`) for extensions that run on-prem and push results to Dragon Copilot
- **[Defined]** Authentication includes `appId` in addition to `tenantId` so the manifest fully describes the auth contract
- **[Defined]** Tool type discriminator (`toolType`) to distinguish integration patterns (contractBased, uiBased, mcpBased, agentBased)
- **[Defined]** Tool-level relevance filtering (`relevanceFilteringCriteria`) so tools declare which body parts and modalities they apply to
- **[Defined]** Customer-configurable tool settings (`configurationTemplate`) using standard JSON Schema, enabling partners to expose settings that customers configure at installation time
- **[Defined]** Standardized DICOM modality codes (`DicomModality` enum) and body part identifiers (`BodyPart` enum) for consistent filtering across tools
- **[Defined]** Input config supports `minNumberOfPriors` and `maxNumberOfPriors` for precise control over how many prior reports to include
- **[Planned]** Platform support for `toolType` values beyond `contractBased` (uiBased, mcpBased, agentBased)
- **[Planned]** Partner-provided UI components for `configurationTemplate` (e.g., React-based settings panels)

## Special Notes

### Adaptive Cards

DC enables the use of Adaptive Cards, which are customizable UI elements that a Partner's Extension API may provide to influence how their results are rendered within DC. To maintain a more consistent and responsive UI experience, DCR does not support Adaptive Cards.

### publisher.json

While DCP's manifest contained this file, recent enhancements in Partner center and the UI flow of the manifest uploads, likely make this file unnecessary. Therefore, we don't include it.

### Structured vs. unstructured report payloads

The current RadiologyReport schema uses a structured format — a dictionary of named sections (indication, findings, impression, etc.) with typed metadata (aiGenerated, aiConfidence, sectionOrder). This structure enables the platform and consumers (Radiance, UI, quality check extensions) to programmatically access specific report sections.

In the future, we should review the level of structure required. A less structured payload (e.g., a single free-text body with optional metadata) would lower the onboarding bar for partners and customers — fewer fields to populate, fewer constraints to satisfy, and broader compatibility with diverse reporting systems. This could encourage adoption, particularly for partners whose systems don't naturally produce section-level structure.

However, reducing structure has tradeoffs. Existing extensions and Radiance expect named sections to drive workflows (e.g., quality checks that compare findings against impressions). A fully unstructured payload would shift parsing responsibility to each consumer, lose the ability to validate section-level completeness, and may raise compliance concerns if regulatory requirements depend on identifiable report sections. The right balance depends on real partner integration experience.


## Content-Types and Platform Impact

DCR introduces new content-types under the `dsp.rad` namespace:
- `application/vnd.ms-dragon.dsp.rad.report+json` — radiology report payload (the payload schema internally uses an array of reports)
- `application/vnd.ms-dragon.dsp.rad.dictation+json` — raw dictated text from speech-to-text
- `application/vnd.ms-dragon.dsp.rad.quality-result+json` — quality check recommendations, severity, provenance, and reference resources for a radiology report

These follow the existing DCP convention where the content-type names the data type (singular), and the payload schema defines the internal structure.

### How content-types flow through the workflow layer

Content-types are **metadata labels within the workflow engine, not routing mechanisms**. The workflow engine is content-type agnostic (the platform's artifact preparation layer does use content-types to select typed models — see "How the platform enforces correctness" above):

| Layer | Role | Awareness of content-type |
|---|---|---|
| **Workflow engine** | Stores artifacts by name, maps named artifacts to named tool inputs via recipes, calls tool endpoints | None — routes by artifact name, not content-type |
| **Recipe compiler** | Translates extension manifest into a Recipe with tools, inputs, tasks | Passes content-type as a string on ToolInput/ToolOutput — no parsing or validation |

Because the workflow engine treats payloads as opaque JSON and routes by artifact name (not content-type), supporting new DCR content-types requires no changes to the workflow engine, the recipe schema, or the workflow API. When a DCR extension manifest is installed, the recipe compiler automatically generates a recipe from the manifest — the new content-types are carried as metadata strings, not interpreted by the engine.


## Body Parts and Modalities

DCR-Extensions reference body parts and imaging modalities in multiple places. Each place uses a different representation suited to its purpose.

### Body Parts

Body parts appear in:

- `BodyPart` in `dcr-extension-manifest.json` — An enum of 21 DICOM Body Part Examined values (e.g., CHEST, ABDOMEN, HEAD, BRAIN, KNEE). Used in `relevanceFilteringCriteria` (to filter which tools apply to a given study) and in `DragonInputConfig` (to filter which prior reports to include as input for a tool). Must be a known, finite set for reliable matching. See `dcr-extension-manifest.json` for the full list. Curated from DICOM Tag 0018,0015, covering the anatomy that radiology AI vendors most commonly specialize in. Values were selected based on existing usage in `diag-radex-extension-service` and `diag-radiance-reporting-service`.

- `StudyInformation.bodyParts` in `dcr-dragon-extensibility-api.yaml` — A free-text string array populated by the platform from the source system. Values may not match the manifest enum (e.g., "Lung" vs. "CHEST"). Not constrained — these are informational context passed to the extension, not used for filtering.

- `StructuredFinding.bodyPart` in `dcr-dragon-extensibility-api.yaml` — A coded object with `code`, `system`, and `description` (e.g., RadLex code RID1301 via gladrad.org for "Lung"). Used by AI vendors to identify anatomy with standard terminology in structured findings. The coding system is partner-chosen, not platform-constrained.

### Imaging Modalities

Imaging modalities appear in:

- `DicomModality` in `dcr-extension-manifest.json` — An enum of 10 DICOM modality codes: CR, CT, DX, MG, MR, NM, PT, RF, US, XA. Used in `relevanceFilteringCriteria` (to filter which tools apply to a given study) and in `DragonInputConfig` (to filter which prior reports to include as input for a tool). Curated from DICOM Tag 0008,0060, covering the most common radiology modalities. Values were selected based on existing usage in `diag-radex-extension-service` and `diag-radiance-reporting-service`. Omits uncommon modalities (e.g., OT, SR, KO, PR) that are unlikely to be primary study modalities.

- `StudyInformation.modality` in `dcr-dragon-extensibility-api.yaml` — A free-text string populated by the platform from the source system. Not constrained to the manifest enum — the value passes through whatever the source system provides.

### Enum vs. free-form values

The manifest constrains body parts and modalities to curated enums, but incoming study/order data from source systems (EHR, PACS, RIS) is always free-form and varies per institution — a CT Chest study might arrive as "CHEST", "Chest", "Lung", "thorax", or "pulmonary". The platform therefore requires a normalization layer to match source system values to manifest-declared values regardless of whether those values are enum-constrained or free-form. The enum reduces the normalization problem to one side (source system values only), but does not eliminate it.

For now, the curated enum is the simplest starting point — it gives partners an unambiguous set of values and reduces the normalization surface. Since a normalization layer is required either way, the enum can be relaxed to support free-form values later with modest incremental cost, and any such relaxation would be additive (non-breaking for existing manifests).


## Related Repositories

Repositories that define or influence the DCR-extension contract:

| Repository | Role | Relevance to DCR-extensions |
|---|---|---|
| [`dragon-copilot-extension-samples`](https://github.com/microsoft/dragon-copilot-extension-samples) | Dragon Copilot extension SDK — DCP OpenAPI spec, CLI, reference models, sample manifests | DCR reuses the DCP envelope (DragonStandardPayload, ProcessResponse, DSP) and shared schemas (Encounter, Patient, etc.). |
| [`hls-dax-core-docs`](https://dev.azure.com/msazuredev/Healthcare/_git/hls-dax-core-docs) | DAX Core — workflow engine and recipe schema definitions | Defines how extension manifests are translated into recipes and executed. Content-type agnostic — DCR content-types require no workflow engine changes. |
| [`diag-radex-extension-service`](https://dev.azure.com/msazuredev/Healthcare/_git/diag-radex-extension-service) | Radiology Extensions — partner-facing API for AI draft reports and quality checks | The `DraftReportDto`, `QualityCheckResultDto`, and vendor sample data (GladRad, Annalise, Gleamer) informed the RadiologyReport and RadiologyQualityResult schemas. |
| [`diag-radiance-reporting-service`](https://dev.azure.com/msazuredev/Healthcare/_git/diag-radiance-reporting-service) | Radiance — radiology reporting workflow and AI report generation | The `TemplateSectionType` enum, `Order`/`Exam` models, and `PriorReport_V0` informed the report section names and structure. |
| [`hms-controlplane`](https://dev.azure.com/msazuredev/HLS%20AI%20Platform/_git/hms-controlplane) | DAC backend — extension verification, installation, and lifecycle management | Defines `PayloadType.DragonCopilotRadiologyApp` and `OfferType.RadiologistsWorkflow`. Handles extension upload, malware scanning, and verification. |
| [`hms-coreservices`](https://dev.azure.com/msazuredev/HLS%20AI%20Platform/_git/hms-coreservices) | DAC core services — entitlements, settings, and org management | Manages extension entitlements (`HLSProduct.Radiology`) and simple key-value extension configuration. Does not yet support JSON Schema-based `configurationTemplate`. |
| [`hms-portal`](https://dev.azure.com/msazuredev/HLS%20AI%20Platform/_git/hms-portal) | DAC frontend — extension marketplace and customer admin portal | Provides the extension marketplace UI, custom extension upload, and Radiance settings pages for radiology. |
| [`hms-partnercenter`](https://dev.azure.com/msazuredev/HLS%20AI%20Platform/_git/hms-partnercenter) | Partner portal — where partners upload extension packages | Supports `workload-type/dragon-copilot-radiology-app` for radiology extension uploads. |


