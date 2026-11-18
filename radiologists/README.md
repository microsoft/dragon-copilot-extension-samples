# Dragon Copilot (radiologists) Extension Samples

Welcome! This section contains sample code and documentation for building **Dragon Copilot (radiologists)** extensions. You can read, play with, or adapt from these samples to create your own extensions.

> ⚠️ **Work in progress**: Radiologists Workflows are still in-development and will change.

## 📚 Contents

- [Dragon Copilot Extension Samples](#dragon-copilot-radiologists-extension-samples)
    - [📝 Overview](#-overview)
    - [🚀 Getting Started](#-getting-started)
    - [🛠️ Tools](#️-tools)

## 📝 Overview

Key resources:

- [Shared Platform Documentation](../doc/) — Authentication guidance and resources for all products in which Dragon Copilot calls a Partner service. For integrations in which a Partner calls a Dragon Copilot endpoint, see the [Radiologists authentication documentation](partner-initiated/authentication.md).
- Sample [`Radiologists Workflow`](src/) with best practices
- CLI tools to initialize, generate manifests, validate, and package Radiologists Workflows

### Radiologists Extensions Overview

| Type                      | Description                                                                            | Use Case                                                    |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Radiologists Workflow** | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom radiology data processing |

### Two tool types

Every tool declares a `toolType`.

**`contractBased`, where Dragon Copilot calls you.** During a radiologists workflow session Dragon Copilot
sends a request to your endpoint and waits for the response, so you implement and host
`POST /v1/process`. Your manifest declares an `endpoint` and the `inputs` you accept. Used for a
quality check run against a draft report.

**`partnerInitiated`, where you call Dragon Copilot.** Your system produces a result on its own
schedule and posts it to Dragon Copilot's [submission endpoint](partner-initiated/README.md#submitting-a-result),
so nothing calls you and there is no endpoint to host. Your manifest
declares neither `endpoint` nor `inputs`, because you are the one supplying the data. Used for an
AI generated pre-draft report, ready before the radiologist opens the study.

A single manifest can declare tools of both types.

### Repository layout

| Path                                                                      | What is in it                                                                                                                                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`manifest/`](manifest/)                                                  | A reference `extension.yaml` showing every field and both tool types. The schema it validates against ships with the [CLI](../tools/dragon-copilot-cli/src/schemas/radiologists/). |
| [`extensibility-api/`](extensibility-api/)                                | The `contractBased` contract, including the `POST /v1/process` envelope and its payload schemas                                                                                    |
| [`partner-initiated/`](partner-initiated/)                                | The `partnerInitiated` contracts, schemas, and worked examples                                                                                                                     |
| [`src/models/`](src/models/)                                              | Shared C# types for both directions                                                                                                                                                |
| [`src/samples/ContractBased/`](src/samples/ContractBased/README.md)       | Runnable `contractBased` samples in C# and Python                                                                                                                                  |
| [`src/samples/PartnerInitiated/`](src/samples/PartnerInitiated/README.md) | Runnable `partnerInitiated` sample                                                                                                                                                 |

You will find an `extension.yaml` in three places:

- [`manifest/extension.yaml`](manifest/extension.yaml) is a reference. It is not wired to any sample, and it exists to show every field and both tool types in one file.
- [`src/samples/ContractBased/extension.yaml`](src/samples/ContractBased/extension.yaml) and [`src/samples/PartnerInitiated/extension.yaml`](src/samples/PartnerInitiated/extension.yaml) are the real manifests for those samples, so each declares only the tools its sample actually implements.

### Versioning

Three independent version axes appear in these artifacts. They are **declarations recorded at manifest upload time** and are not part of each `POST /v1/process` payload (apart from the optional `extensibilityApiVersion` field on the request envelope, which is informational):

- **API version** — `info.version` in [`radiologists-extensibility-api.yaml`](extensibility-api/radiologists-extensibility-api.yaml) (semantic `x.y.z`). The version of the extensibility API contract as a whole. A Partner records the version they built against in their manifest's `radiologistsExtensibilityApiVersion` field. Every manifest declares it, including manifests whose tools are all `partnerInitiated`. The same API version may also appear on each request as the optional `extensibilityApiVersion` field on the `ProcessRequest` envelope (informational).
- **Extension version** — the manifest's top-level `version` field (`x.y.z`). The Partner's own product version for their extension, independent of the API version.
- **Payload schema version** — each payload schema (`Report`, `PatientInformation`, `QualityCheckResult`) declares its own version via the `x-ms-schema-version` annotation in [`radiologists-extensibility-api.yaml`](extensibility-api/radiologists-extensibility-api.yaml) (`major.minor`). The Partner declares which version of each payload they accept (inputs) or produce (outputs) via the required `schemaVersion` field on every input and output in their manifest. This gives per-payload traceability — e.g. "this extension accepts `Report` v1.0" — without putting a version on the wire payloads themselves. The `partnerInitiated` draft report declares its version the same way, in [`draft-report-schema.json`](partner-initiated/draft-report-schema.json), and a `partnerInitiated` tool's output `schemaVersion` refers to it.

## 🚀 Getting Started

For repo setup, cloning instructions, and contributing guidelines, see the [root README](../README.md).

For a beginner-focused, step-by-step guide, see [QUICKSTART.md](./QUICKSTART.md).

## 🛠️ Tools

The [Dragon Copilot CLI](../tools/dragon-copilot-cli/README.md) scaffolds, validates, and packages radiologists extension manifests. See the [CLI README](../tools/dragon-copilot-cli/README.md) for installation and the full command reference.

### Typical workflow

```bash
# 1. Scaffold a new extension manifest. The wizard prompts for the extension
#    name, description, version, and extensibility API version, then your
#    Microsoft Entra tenant ID and an optional initial tool. Add a tool when prompted
#    so the manifest passes validation.
dragon-copilot radiologists init

# 2. Alternatively, start from a built-in template:
dragon-copilot radiologists generate --template quality-check -o extension.yaml
dragon-copilot radiologists generate --template pre-draft-report -o extension.yaml

# 3. Edit extension.yaml — for a contractBased tool, set your real endpoint and
#    adjust the inputs/outputs. A partnerInitiated tool declares neither.

# 4. Validate the manifest against the JSON schema and business rules:
dragon-copilot radiologists validate ./extension.yaml

# 5. Package the manifest into a distributable .zip (validation runs first):
dragon-copilot radiologists package
```

**Notes**

- `generate` requires either `--template <name>` (`quality-check` or `pre-draft-report`) or `--interactive`. Use `--interactive` to add more tools to an existing manifest.
- A manifest must declare at least one tool to pass `validate`.
- Run `dragon-copilot radiologists --help` (or `dragon-copilot radiologists <command> --help`) for all options.
