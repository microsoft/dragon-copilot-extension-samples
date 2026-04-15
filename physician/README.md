# Dragon Copilot for Physician Extension Samples

Welcome! This section contains sample code and documentation for building **Dragon Copilot for Physicians** extensions. You can read, play with, or adapt from these samples to create your own extensions.

## 📚 Contents

- [Dragon Copilot Extension Samples](#dragon-copilot-extension-samples)
    - [📝 Overview](#-overview)
    - [🚀 Getting Started](#-getting-started)
    - [️ Tools](#️-tools)

## 📝 Overview

Key resources:

- [Shared Platform Documentation](../doc/) — Authentication guides and resources common across all products
- Sample [`Physician Workflow`](src/samples/) with best practices
- CLI tools to initialize & package both **Extensions** and **Clinical Application Connectors**

### Extensions vs. Clinical Application Connectors

| Type                               | Description                                                                            | Use Case                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Physician Workflow**             | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom clinical data processing |
| **Clinical Application Connector** | EHR integrations and API connectors that interface with clinical applications          | Connect Dragon Copilot to external clinical systems        |

## 🚀 Getting Started

For repo setup, cloning instructions, and contributing guidelines, see the [root README](../README.md).

## 🛠️ Tools

See the [Dragon Copilot CLI](../tools/dragon-copilot-cli/README.md) for tools to initialize, generate manifests, validate, and package physician extensions and clinical application connectors.
