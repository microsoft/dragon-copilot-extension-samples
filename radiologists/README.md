# Dragon Copilot (radiologists) Extension Samples

Welcome! This section contains sample code and documentation for building **Dragon Copilot (radiologists)** extensions. You can read, play with, or adapt from these samples to create your own extensions.

> ⚠️ **Work in progress**: Radiologists Workflows are still in-development and will change.

## 📚 Contents

- [Dragon Copilot Extension Samples](#dragon-copilot-extension-samples)
    - [📝 Overview](#-overview)
    - [🚀 Getting Started](#-getting-started)
    - [️ Tools](#️-tools)

## 📝 Overview

Key resources:

- [Shared Platform Documentation](../doc/) — Authentication guides and resources common across all products
- Sample [`Radiologists Workflow`](src/) with best practices
- CLI tools to initialize, generate manifests, validate, and package Radiologists Workflows

### Radiologists Extensions Overview

| Type                      | Description                                                                            | Use Case                                                    |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Radiologists Workflow** | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom radiology data processing |

### Versioning

Three independent version axes appear in these artifacts. They are **declarations recorded at manifest upload time** and are not part of each `POST /v1/process` payload (apart from the optional `extensibilityApiVersion` field on the request envelope, which is informational):

- **API version** — `info.version` in [`radiologists-extensibility-api.yaml`](radiologists-extensibility-api.yaml) (semantic `x.y.z`). The version of the extensibility API contract as a whole. A Partner records the version they built against in their manifest's `radiologistsExtensibilityApiVersion` field. The same API version may also appear on each request as the optional `extensibilityApiVersion` field on the `ProcessRequest` envelope (informational).
- **Extension version** — the manifest's top-level `version` field (`x.y.z`). The Partner's own product version for their extension, independent of the API version.
- **Payload schema version** — each payload schema (`Report`, `PatientInformation`, `QualityCheckResult`) declares its own version via the `x-ms-schema-version` annotation in [`radiologists-extensibility-api.yaml`](radiologists-extensibility-api.yaml) (`major.minor`). The Partner declares which version of each payload they accept (inputs) or produce (outputs) via the required `schemaVersion` field on every input and output in their manifest. This gives per-payload traceability — e.g. "this extension accepts `Report` v1.0" — without putting a version on the wire payloads themselves.

## 🚀 Getting Started

For repo setup, cloning instructions, and contributing guidelines, see the [root README](../README.md).

## 🛠️ Tools

The [Dragon Copilot CLI](../tools/dragon-copilot-cli/README.md) scaffolds, validates, and packages radiologists extension manifests. See the [CLI README](../tools/dragon-copilot-cli/README.md) for installation and the full command reference.

### Typical workflow

```bash
# 1. Scaffold a new extension manifest. The wizard prompts for the extension name,
#    version, your Azure Entra ID tenant ID, and an optional initial tool.
#    Add a tool when prompted so the manifest passes validation.
dragon-copilot radiologists init

# 2. Alternatively, start from the built-in quality-check template:
dragon-copilot radiologists generate --template quality-check -o extension.yaml

# 3. Edit extension.yaml — set your real endpoint and adjust the inputs/outputs.

# 4. Validate the manifest against the JSON schema and business rules:
dragon-copilot radiologists validate ./extension.yaml

# 5. Package the manifest into a distributable .zip (validation runs first):
dragon-copilot radiologists package
```

**Notes**

- `generate` requires either `--template <name>` (currently only `quality-check`) or `--interactive`. Use `--interactive` to add more tools to an existing manifest.
- A manifest must declare at least one tool to pass `validate`.
- Run `dragon-copilot radiologists --help` (or `dragon-copilot radiologists <command> --help`) for all options.
