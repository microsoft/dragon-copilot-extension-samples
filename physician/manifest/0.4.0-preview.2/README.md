# Manifest reference — schema 0.4.0-preview.2 (Public Preview)

A field-by-field reference for the [manifest schema](../../../tools/dragon-copilot-cli/src/schemas/physician/physician-extension-manifest-schema-0.4.0-preview.2.json). For a complete annotated manifest, see [`manifest-example.yaml`](manifest-example.yaml). For the concepts, see [Conversational Extensions](../../CONVERSATIONAL.md).

> **Public Preview.** Fields and behavior may change before general availability. The JSON schema is authoritative. A test in the CLI checks that every enum value in the schema is documented here.

## Contents

- [Top-level fields](#top-level-fields)
- [Tool fields common to every type](#tool-fields-common-to-every-type)
  - [Triggers](#triggers)
- [DragonAPI tools](#dragonapi-tools)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
- [MCP tools](#mcp-tools)
- [OpenAPI tools](#openapi-tools)
- [CopilotStudio tools](#copilotstudio-tools)
- [Runtime parameter bindings](#runtime-parameter-bindings)
- [Custom extractors](#custom-extractors)
- [Validation rules](#validation-rules)

## Top-level fields

| Field | Type | Required | Default | What it does |
| --- | --- | --- | --- | --- |
| `schemaVersion` | string | ✅ | — | Must be exactly `0.4.0-preview.2`. This opts the manifest in to this schema. Manifests that declare `0.3.0` are still validated by the 0.3.0 schema. |
| `name` | string | ✅ | — | Extension ID. Lowercase letters, digits and hyphens, and must start with a letter (`^[a-z][a-z0-9-]*$`). |
| `caption` | string | ✅ | — | Display name of the extension. |
| `description` | string | ✅ | — | Long-form description of the extension. |
| `version` | string | ✅ | — | Your extension's version, in `x.y.z` form (for example `1.0.0`). |
| `auth` | object | ✅ | — | Extension authentication identity. |
| `auth.tenantId` | GUID string | ✅ | — | Microsoft Entra ID tenant that hosts the extension's app registration. See [Authentication](../../../doc/Authentication.md). It is ignored when every tool is `CopilotStudio`, because those use a different deployment model. |
| `tools` | array | ✅ | — | One or more tools (at least 1). |

```yaml
schemaVersion: 0.4.0-preview.2
name: clinical-reference
caption: Clinical Reference
description: Lab reference ranges and drug interaction checks.
version: 1.0.0
auth:
  tenantId: 00000000-0000-0000-0000-000000000000
tools: [ ... ]
```

## Tool fields common to every type

| Field | Type | Required | Default | What it does |
| --- | --- | --- | --- | --- |
| `name` | string | ✅ | — | Tool ID. Must be unique within the manifest, follows `^[a-z][a-z0-9-]*$`, and must start with a letter. |
| `caption` | string | ✅ | — | Display name shown in the UI. |
| `description` | string | ✅ | — | **Tool-selection prompt.** Dragon Copilot reads it to decide *when* to call the tool, so describe the situations and questions it handles. |
| `type` | enum | ✅ | — | Integration type: `DragonAPI`, `MCP`, `OpenAPI` or `CopilotStudio`. This value decides which type-specific fields are allowed. |
| `triggers` | array of enum | ✅ | — | What activates the tool. See [Triggers](#triggers). |
| `timeout` | integer | | `5` | Hard timeout in seconds. Allowed range is 5–60. Dragon Copilot aborts the call after this many seconds. The platform default of 5 s is short for model-backed tools, so set it explicitly. |
| `isExclusive` | boolean | | `false` | When `true`, the tool's result is not blended with other tools in the same assistant response. Allowed on `MCP`, `OpenAPI` and `CopilotStudio`; not allowed on `DragonAPI`. |

Any field not listed for the tool's type is rejected. There are no cross-type fields. For example, `endpoint` on an OpenAPI tool is an error.

### Triggers

| Trigger | Meaning | Allowed on |
| --- | --- | --- |
| `DataAvailable` | Runs automatically once all required inputs (note, transcript, EHR context, …) are available. Can be retried. | `DragonAPI` |
| `ExplicitRequest` | Runs only on a deliberate user action in the UI (button, card or command). Never runs automatically. | `DragonAPI` |
| `IntentDriven` | Runs when Dragon Copilot decides, from the user's request and the tool `description`, that the tool should be called. | `MCP`, `OpenAPI`, `CopilotStudio` |

`triggers` must be non-empty and contain no duplicates, and every entry must be allowed for the tool's `type`.

## DragonAPI tools

Workflow extensions, which Dragon Copilot calls with an HTTP `POST` to your endpoint. See [Physician extensions](../../README.md).

| Field | Type | Required | What it does |
| --- | --- | --- | --- |
| `endpoint` | URI | ✅ | HTTPS URL that receives the request payload (for example `https://api.example.com/v1/process`). |
| `inputs` | array | ✅ | Data the tool receives (at least 1). See [Inputs](#inputs). |
| `outputs` | array | | Data the tool returns (at least 1 if present). Leave it out for fire-and-forget tools. See [Outputs](#outputs). |

```yaml
- name: note-summary
  caption: Note Summary
  description: Summarizes the clinical note.
  type: DragonAPI
  triggers: [DataAvailable]
  timeout: 60
  endpoint: https://api.example.com/v1/process
  inputs:
    - name: note
      description: Clinical note
      content-type: application/vnd.ms-dragon.dsp.note+json
    - name: ehr
      description: EHR context
      content-type: application/fhir.ehr-context+json
      include: [patient, current-encounter]
      required: false
  outputs:
    - name: summary
      description: Summary card
      content-type: application/vnd.ms-dragon.dsp+json
```

### Inputs

| Field | Type | Required | Default | What it does |
| --- | --- | --- | --- | --- |
| `name` | string | ✅ | — | Name of the input in the request payload. |
| `description` | string | ✅ | — | What the input is. |
| `content-type` | enum | ✅ | — | The kind of data. See the table below. |
| `include` | array of enum | only for EHR context | — | EHR concepts to resolve into the input's FHIR Bundle. Required when `content-type` is `application/fhir.ehr-context+json`, and not allowed on any other content type. Must be non-empty and unique. |
| `required` | boolean | | `true` | When `false`, the tool still runs if this input isn't available. |

| `content-type` | Carries |
| --- | --- |
| `application/vnd.ms-dragon.dsp+json` | The full Dragon Standard Payload: session, encounter and clinical context. |
| `application/vnd.ms-dragon.dsp.note+json` | The generated clinical note. |
| `application/vnd.ms-dragon.dsp.transcript+json` | The final speech-to-text transcript of the encounter. |
| `application/vnd.ms-dragon.dsp.iterative-transcript+json` | Transcript segments streamed while the encounter is in progress. |
| `application/vnd.ms-dragon.dsp.iterative-audio+json` | Audio chunks streamed while the encounter is in progress. |
| `application/vnd.ms-dragon.adaptivecard-content+json` | Adaptive Card content, such as data the user submits from a card. |
| `application/fhir.ehr-context+json` | A FHIR Bundle of EHR data, scoped by `include`. |

| `include` | Resolves |
| --- | --- |
| `provider` | The practitioner on the encounter. |
| `patient` | Patient demographics. |
| `current-encounter` | The current encounter. |
| `problem-list` | The patient's problem list. |
| `current-encounter-diagnoses` | Diagnoses recorded on the current encounter. |
| `reason-for-visit` | The reason for the visit. |
| `conditions` | The patient's conditions. |

### Outputs

| Field | Type | Required | What it does |
| --- | --- | --- | --- |
| `name` | string | ✅ | Output name. |
| `description` | string | ✅ | What the output is. |
| `content-type` | enum | ✅ | Only `application/vnd.ms-dragon.dsp+json`, a Dragon Standard Payload response (for example, cards to show the clinician). |

## MCP tools

A [Model Context Protocol](https://modelcontextprotocol.io/) server, reached over Streamable HTTP. Dragon Copilot discovers its tools and calls them. Sample: [`Conversational/Mcp`](../../src/samples/DragonCopilot/Conversational/Mcp/README.md).

| Field | Type | Required | What it does |
| --- | --- | --- | --- |
| `endpoint` | URI | ✅ | MCP server URL (for example `https://mcp.example.com/mcp`). |
| `expose` | array of string | | MCP tool names Dragon Copilot may call (at least 1, unique). If omitted, every discovered tool is available. |
| `customExtractors` | map | | Keyed by MCP tool name. See [Custom extractors](#custom-extractors). |
| `runtimeParamBindings` | map | | Keyed by MCP tool name. `target` is **required** and must be `argument`, `header` or `sideChannel`. See [Runtime parameter bindings](#runtime-parameter-bindings). |
| `isExclusive` | boolean | | See [common fields](#tool-fields-common-to-every-type). |

```yaml
- name: clinical-reference
  caption: Clinical Reference
  description: Use for lab reference ranges and unit conversions.
  type: MCP
  triggers: [IntentDriven]
  timeout: 30
  endpoint: https://mcp.example.com/mcp
  expose: [get_lab_reference_range]
```

## OpenAPI tools

A REST API described by an OpenAPI 3.x document. Each operation is identified by its `operationId`. Sample: [`Conversational/OpenApi`](../../src/samples/DragonCopilot/Conversational/OpenApi/README.md).

| Field | Type | Required | What it does |
| --- | --- | --- | --- |
| `specUrl` | URI | one of | URL of the OpenAPI document. |
| `specString` | string | one of | The OpenAPI document inline, as JSON or YAML text. Provide exactly one of `specUrl` or `specString`. |
| `expose` | array of string | | `operationId`s Dragon Copilot may call (at least 1, unique). |
| `customExtractors` | map | | Keyed by `operationId`. |
| `runtimeParamBindings` | map | | Keyed by `operationId`. `target` is `body` (default) or `header`. |
| `isExclusive` | boolean | | See [common fields](#tool-fields-common-to-every-type). |

The API's base URL comes from the document's `servers` entry, so OpenAPI tools have no `endpoint` field.

```yaml
- name: drug-interactions
  caption: Drug Interactions
  description: Use to check interactions between two or more medications.
  type: OpenAPI
  triggers: [IntentDriven]
  timeout: 30
  specUrl: https://api.example.com/openapi/v1.json
  expose: [checkInteractions]
```

## CopilotStudio tools

A published [Microsoft Copilot Studio](https://learn.microsoft.com/microsoft-copilot-studio/) agent. Guide: [`Conversational/CopilotStudio`](../../src/samples/DragonCopilot/Conversational/CopilotStudio/README.md).

| Field | Type | Required | Default | What it does |
| --- | --- | --- | --- | --- |
| `environmentId` | GUID string | ✅ | — | The Power Platform environment that hosts the agent. |
| `agentIdentifier` | string | ✅ | — | The agent's schema name (for example `cr123_clinicalAgent`). |
| `cloud` | enum | | `Prod` | Cloud of the environment: `Prod` (commercial), `Gov` (GCC), `High` (GCC High), `DoD`, or `Mooncake` (operated by 21Vianet). |
| `agentType` | enum | | `Published` | `Published` for an agent you built and published; `Prebuilt` for a prebuilt agent. |
| `runtimeParamBindings` | list | | — | A **flat list** (agents have no operations). `target` is `intent` (default) or `sideChannel`. |
| `isExclusive` | boolean | | `false` | See [common fields](#tool-fields-common-to-every-type). |

`expose` and `customExtractors` are not allowed: the agent composes its own answer.

```yaml
- name: formulary-agent
  caption: Formulary Agent
  description: Use for questions about the hospital formulary.
  type: CopilotStudio
  triggers: [IntentDriven]
  timeout: 45
  environmentId: 11111111-2222-3333-4444-555555555555
  agentIdentifier: cr123_formularyAgent
  cloud: Prod
  agentType: Published
```

## Runtime parameter bindings

`runtimeParamBindings` maps an input: it tells the platform to inject a runtime value into the outbound call. The value never passes through the assistant's model, which neither sees nor retypes it. You name the **source** and say where it goes (**target** + **path**). Bindings are the request-side counterpart of [custom extractors](#custom-extractors).

Shape by type:

- **MCP / OpenAPI:** a map keyed by MCP tool name or `operationId`, where each value is a non-empty list of bindings.
- **CopilotStudio:** a non-empty list of bindings.

### Binding fields

| Field | Type | Required | Default | What it does |
| --- | --- | --- | --- | --- |
| `source` | enum | ✅ | — | The runtime value to send. See [Sources](#sources). |
| `target` | enum | MCP: ✅ | OpenAPI: `body`; CopilotStudio: `intent` | Where in the call the value goes. See [Targets](#targets). |
| `path` | string (1–256) | ✅ | — | Destination within the target. See [Targets](#targets). |
| `required` | boolean | | `false` | `true` means the call is **not made** if the value is unavailable (except `transcript` / `transcriptTurns`: the call proceeds without them, so handle a missing transcript). `false` means the binding is skipped and the call proceeds. |

### Sources

A source with no value on a request is treated as absent, and `required` decides whether the call proceeds. Sources marked PHI/EUII below are treated as PHI/EUII by Dragon Copilot; handle them with the same care in your service and never log their values.

For MCP `argument` and OpenAPI `body` / `header` targets, declare the bound field in your tool's contract as optional. Dragon Copilot removes bound fields from the tool definition its model sees, ignores any value the model supplies for them, and sends the bound value instead.

| `source` | Value | PHI/EUII | Requires |
| --- | --- | --- | --- |
| `transcript` | The transcript as a JSON object in Dragon Standard Payload (DSP) format: `{transcript:{turns:[...]}}`. Not a string. | ✅ | A recorded encounter |
| `transcriptTurns` | Only the inner transcript object, `{turns:[...]}`, for services that expect the turns without the wrapper. | ✅ | A recorded encounter |
| `patientContext` | The current patient context. | ✅ | Patient context¹ |
| `conversationId` | The platform conversation ID. | | |
| `locale` | The request locale (for example `en-US`). | | |
| `mrn` | The patient's medical record number, when the session has one. | ✅ | Patient context¹ |
| `organizationId` | The caller's organization ID. | | |
| `sessionUniqueId` | The unique patient identifier the Dragon client supplies for the session. | ✅ | Patient context¹ |
| `sessionStart` | The session start timestamp (ISO 8601). | | |
| `correlationId` | Trace ID for the clinician's request. Shared by every tool call made while answering it, and recorded in Dragon Copilot logs — log it and quote it when contacting support. | | |
| `requestId` | A new ID for each individual tool call. Use it to tell apart, or de-duplicate, several calls that share one `correlationId`. | | |
| `practitionerId` | The practitioner (clinician) ID. | ✅ | |
| `practitionerSpecialty` | The practitioner's specialty. | | |

¹ Present only when the session has a patient: either linked from the EHR integration or entered manually in Dragon Copilot. Without one, these sources are absent, so bind them with `required: false` unless your tool can't work without a patient.

### Targets

| `target` | Sends the value… | `path` means | Allowed on |
| --- | --- | --- | --- |
| `body` | in the JSON body of the HTTP request | Dotted path with optional `[n]` indices (`patient.mrn`, `items[0].text`), no wildcards | OpenAPI (default) |
| `header` | as an HTTP request header | The header name (`X-Correlation-Id`) | MCP, OpenAPI |
| `argument` | in the MCP tool-call arguments, which your tool code receives | Dotted path with optional `[n]` indices | MCP |
| `sideChannel` | out of band, not visible to the agent's model: MCP `_meta` or the Copilot Studio activity `value` | Dotted path with optional `[n]` indices | MCP, CopilotStudio |
| `intent` | appended to the query text sent to the agent, as a delimited, labelled block (for agents without a structured parameter slot) | A label matching `^[A-Za-z_][A-Za-z0-9_-]*$` | CopilotStudio (default) |

The platform enforces reserved/credential header names, the header-name charset, and path depth and index limits at registration and call time.

### Examples

```yaml
# MCP: keyed by MCP tool name; target is required
runtimeParamBindings:
  get_lab_reference_range:
    - source: locale
      target: argument
      path: locale
    - source: correlationId
      target: sideChannel          # MCP _meta
      path: dragon.correlationId
    - source: requestId
      target: header
      path: X-Request-Id
```

```yaml
# OpenAPI: keyed by operationId; target defaults to body
runtimeParamBindings:
  checkInteractions:
    - source: transcriptTurns
      path: context.transcript     # body
      required: true               # don't call without a transcript
    - source: correlationId
      target: header
      path: X-Correlation-Id
```

```yaml
# CopilotStudio: flat list; target defaults to intent
runtimeParamBindings:
  - source: practitionerSpecialty
    path: Specialty                # intent label
  - source: conversationId
    target: sideChannel            # activity value
    path: dragon.conversationId
```

## Custom extractors

`customExtractors` maps the output: it tells Dragon Copilot how to project fields of your tool's response into the assistant response, such as the answer text and evidence cards. Available on MCP and OpenAPI only, as a map keyed by MCP tool name or `operationId`. Each value is a list of extractors.

| Field | Type | Required | What it does |
| --- | --- | --- | --- |
| `propertyPath` | string | ✅ | JSONPath into the tool's response (see [Evaluation root](#evaluation-root)). Wildcards and array traversal are allowed (`$.result.answer`, `$.evidence[*].url`). |
| `extractorType` | enum | ✅ | How the selected value is rendered. See the table below. |
| `description` | string | | Your own note. |

| `extractorType` | Renders the value as |
| --- | --- |
| `Response Text` | The answer text shown to the clinician. |
| `Evidence Link` | The URL of a cited evidence item. |
| `Evidence Title` | The title of an evidence item. |
| `Evidence Snippet` | A quoted excerpt from an evidence item. |
| `Evidence Author` | The author of an evidence item. |
| `Evidence Image` | An image URL for an evidence item. |
| `Evidence Id` | An identifier for an evidence item. |
| `Document Source` | The source document or publisher the evidence comes from. |

### Evaluation root

`$` is the root of the tool's JSON result:

| Tool type | `$` is |
| --- | --- |
| `MCP` | The tool result's text content, parsed as JSON. Return your result object as JSON text (MCP SDKs that emit `structuredContent` also serialize the same object as text), so `$.summary` selects its top-level `summary` field. Do not prefix paths with `structuredContent`. |
| `OpenAPI` | The JSON response body of the operation. |

If the result is not JSON or a path matches nothing, the raw result text is used as the response. If a `Response Text` path matches an empty value, Dragon Copilot treats the call as having no answer.

```yaml
customExtractors:
  get_lab_reference_range:
    - propertyPath: $.summary
      extractorType: Response Text
    - propertyPath: $.sources[*].url
      extractorType: Evidence Link
    - propertyPath: $.sources[*].title
      extractorType: Evidence Title
```

## Validation rules

Run `dragon-copilot physician validate extension.yaml` to check them all.

| Rule | Detail |
| --- | --- |
| Trigger/type alignment | `DragonAPI` allows only `DataAvailable` / `ExplicitRequest`. `MCP`, `OpenAPI` and `CopilotStudio` allow only `IntentDriven`. |
| No cross-type fields | Only the common fields plus the fields of the tool's `type` are allowed. Unknown fields are rejected. |
| Unique tool names | Each `tools[].name` must be unique in the manifest (checked by the CLI). |
| Name patterns | Extension and tool `name` must match `^[a-z][a-z0-9-]*$`; `version` must match `x.y.z`; `tenantId` and `environmentId` must be GUIDs. |
| OpenAPI document | Exactly one of `specUrl` and `specString`. |
| EHR context `include` | Required on `application/fhir.ehr-context+json` inputs, and not allowed on any other content type. |
| Binding targets | MCP: `argument` / `header` / `sideChannel`, and `target` is required. OpenAPI: `body` / `header`. CopilotStudio: `intent` / `sideChannel`. |
| Intent label | When `target` is `intent`, explicitly or by the CopilotStudio default, `path` must match `^[A-Za-z_][A-Za-z0-9_-]*$`. |
| `timeout` | Integer from 5 to 60. |
| `expose` keys (warning) | `customExtractors` / `runtimeParamBindings` entries keyed by a name that isn't listed in `expose` never run; the CLI warns about them. |
