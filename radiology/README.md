# Dragon Copilot for Radiology Extension Samples

Welcome! This section contains sample code and documentation for building **Dragon Copilot for Radiology** extensions. You can read, play with, or adapt from these samples to create your own extensions.

> ⚠️ **Work in progress**: Radiology Workflows are still in-development and will change.

## 📚 Contents

- [Dragon Copilot Extension Samples](#dragon-copilot-extension-samples)
    - [📝 Overview](#-overview)
    - [🚀 Getting Started](#-getting-started)
    - [️ Tools](#️-tools)

## 📝 Overview

Key resources:

- [Shared Platform Documentation](../doc/) — Authentication guides and resources common across all products
- Sample [`Radiology Workflow`](src/) with best practices
- CLI tools to initialize, generate manifests, validate, and package Radiology Workflows

### Radiology Extensions Overview

| Type                               | Description                                                                            | Use Case                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Radiology Workflow**             | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom radiology data processing |

### Versioning

Three independent version axes appear in these artifacts. They are **declarations recorded at manifest upload time** — none is transmitted on each `POST /v1/process` request:

- **API version** — `info.version` in [`radiology-extensibility-api.yaml`](radiology-extensibility-api.yaml) (semantic `x.y.z`). The version of the extensibility API contract as a whole. A Partner records the version they built against in their manifest's `radiologyExtensibilityApiVersion` field.
- **Extension version** — the manifest's top-level `version` field (`x.y.z`). The Partner's own product version for their extension, independent of the API version.
- **Payload schema version** — each payload schema (`Report`, `PatientInformation`, `QualityCheckResult`) declares its own version via the `x-ms-schema-version` annotation in [`radiology-extensibility-api.yaml`](radiology-extensibility-api.yaml) (`major.minor`). The Partner declares which version of each payload they accept (inputs) or produce (outputs) via the required `schemaVersion` field on every input and output in their manifest. This gives per-payload traceability — e.g. "this extension accepts `Report` v1.0" — without putting a version on the wire payloads themselves.

## 🚀 Getting Started

For repo setup, cloning instructions, and contributing guidelines, see the [root README](../README.md).

## 🛠️ Tools

See the [Dragon Copilot CLI](../tools/dragon-copilot-cli/README.md) for tools to initialize, generate manifests, validate, and package radiology extensions.
