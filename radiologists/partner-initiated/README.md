# `partnerInitiated` tools

Artifacts for tools whose `toolType` is **`partnerInitiated`**: the Partner calls Dragon Copilot (radiologists) to submit results, rather than Dragon Copilot calling the Partner.

See [Tool types](../../README.md#tool-types) in the project README for how this compares with `contractBased`.

## What a Partner builds

Nothing on the receiving side. There is no endpoint to host and no extensibility API to implement. A Partner submits results to Dragon Copilot when a study arrives, unprompted. Dragon Copilot stores them and surfaces them to the radiologist later, when the order is opened.

## Declaring the tool

In `extension.yaml`, a `partnerInitiated` tool omits `endpoint` and `inputs`, since neither is used, and declares only what it produces:

```yaml
- name: preDraftReportGeneratorTool
  toolType: partnerInitiated
  capability: preDraftReportGeneration
  description: Tool to generate a pre-draft radiology report
  outputs:
    - name: preDraftReportResult
      description: Pre-draft radiology report
      content-type: application/vnd.ms-dragon.rad.pre-draft-report+json
      schemaVersion: "1.0"
```

The manifest schema enforces this: `endpoint` and `inputs` are required only when `toolType` is `contractBased`.

## Schemas

[`pre-draft-report-ingest-request-schema.json`](pre-draft-report-ingest-request-schema.json) defines the whole request body: how the Partner identifies their extension, plus the report itself. The customer tenant and environment come from the route, and the submitting Partner is identified from the access token, so neither appears in the body.

[`pre-draft-report-schema.json`](pre-draft-report-schema.json) defines the draft report payload alone, at `x-ms-schema-version` **1.0**. This is what the `schemaVersion` on the output above refers to, and what `application/vnd.ms-dragon.rad.pre-draft-report+json` resolves to. The submission schema references it for its `draftReport` member.

## Samples

- [`PreDraftReportGeneration-Ingest-Request-Example.json`](samples/PreDraftReportGeneration-Ingest-Request-Example.json) — what a Partner posts.
- [`PreDraftReportGeneration-Retrieve-Response-Example.json`](samples/PreDraftReportGeneration-Retrieve-Response-Example.json) — what Dragon Copilot returns when the capability is later invoked for that order.

The retrieve response is included because it is not symmetric with the submission. Dragon Copilot is asked what results exist for an exam, without naming a vendor, so the response is a collection and may contain results from several extensions.
