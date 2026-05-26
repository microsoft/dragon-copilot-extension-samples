# Dragon Copilot Extension Samples

Welcome! This repository contains sample code, models, OpenAPI specs, and developer tools for building extensions across the **Dragon Copilot** product family.

## 📚 Contents

- [Dragon Copilot Extension Samples](#dragon-copilot-extension-samples)
    - [📝 Overview](#-overview)
    - [🚀 Getting Started](#-getting-started)
    - [🛠️ Tools](#️-tools)
    - [🤝 Contributing](#-contributing)
    - [📄 License](#-license)

## 📝 Overview

This repo includes:

- [Shared Platform Documentation](doc/) for authentication guides and resources common across all products
- Sample [`Physician Workflow`](physician/) with best practices
- [`Radiology`](radiology/) extensibility API and models
- CLI [`tools`](tools/dragon-copilot-cli/README.md) to initialize & package **Physician Workflows**, **Radiology Workflows**, and **Clinical Application Connectors**

> ⚠️ **Work in progress**: Radiology Workflows are still in-development and will change.

### Extensions vs. Clinical Application Connectors

| Type                               | Description                                                                            | Use Case                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Physician Workflow**             | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom clinical data processing |
| **Radiology Workflow**             | Custom AI-powered extensions for radiology scenarios (e.g., report quality checking)   | Extend Dragon Copilot for Radiology with custom processing |
| **Clinical Application Connector** | EHR integrations and API connectors that interface with clinical applications          | Connect Dragon Copilot to external clinical systems        |

## 🚀 Getting Started

### 1. Clone the Repository

```powershell
git clone <your-repo-url>
cd dragon-copilot-extension-samples
```

### 2. Choose Your Product

Pick the product you are building an extension for and follow its dedicated quick-start guide:

| Product       | README                                     | Quick Start Guide                                  |
| ------------- | ------------------------------------------ | -------------------------------------------------- |
| **Physician** | [physician/README.md](physician/README.md) | [physician/QUICKSTART.md](physician/QUICKSTART.md) |
| **Radiology** | [radiology/README.md](radiology/README.md) | _Coming soon_                                      |

> **Tip:** Each product's `QUICKSTART.md` is a self-contained, end-to-end walkthrough from setting up your dev environment to testing your extension inside Dragon Copilot.

## 🛠️ Tools

### Dragon Copilot CLI

CLI to easily generate manifests and package integrations for publishing or upload. The CLI supports two types of integrations:

#### Installation

See the [CLI README](tools/dragon-copilot-cli/README.md) for installation instructions.

#### Physician Extension Commands

For creating **Physician Workflows** with automation scripts, event triggers, and dependencies:

```bash
dragon-copilot physician init       # Initialize a new extension project
dragon-copilot physician generate   # Generate or update extension manifest
dragon-copilot physician validate   # Validate extension manifest
dragon-copilot physician package    # Package for distribution
```

#### Radiology Extension Commands

For creating **Radiology Workflows** (e.g., radiology report quality checking):

```bash
dragon-copilot radiology init       # Initialize a new radiology extension project
dragon-copilot radiology generate   # Generate from a template or interactively
dragon-copilot radiology validate   # Validate radiology extension manifest
dragon-copilot radiology package    # Package for distribution
```

#### Connector Commands

For creating **Clinical Application Connectors** (EHR integrations, API connectors):

```bash
dragon-copilot connector init       # Initialize a new connector project
dragon-copilot connector generate   # Generate or update connector manifest
dragon-copilot connector validate   # Validate connector manifest
dragon-copilot connector package    # Package for distribution
```

See the [CLI README](tools/dragon-copilot-cli/README.md) for detailed options, advanced usage, and release instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
