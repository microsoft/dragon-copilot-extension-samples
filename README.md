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
- Sample [`Radiologists Workflow`](radiologists/) with best practices
- [Conversational Extensions](conversational/) (Public Preview) — manifest schema `0.4.0-preview.2` and **MCP**, **OpenAPI** and **Copilot Studio** samples
- [Clinical Application Connector documentation](connector/) for EHR and enterprise API integrations
- CLI [`tools`](tools/dragon-copilot-cli/README.md) to initialize & package **Workflow Extensions**, **Conversational Extensions** and **Clinical Application Connectors**

### Extension types

| Type                               | Description                                                                            | Use Case                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Physician Workflow**             | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom clinical data processing |
| **Clinical Application Connector** | EHR integrations and API connectors that interface with clinical applications          | Connect Dragon Copilot to external clinical systems        |
| **Radiologists Workflow**          | Custom AI-powered extensions that analyze radiology reports and return quality-check recommendations | Extend Dragon Copilot with Report Optimization |
| **Conversational Extension** (Public Preview) | MCP servers, OpenAPI services and Copilot Studio agents the Dragon Copilot orchestrator calls during a conversation | Answer clinician questions with your own tools and agents |

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
| **Radiologists** | [radiologists/README.md](radiologists/README.md) | [radiologists/QUICKSTART.md](radiologists/QUICKSTART.md) |
| **Conversational** (Public Preview) | [conversational/README.md](conversational/README.md) | [conversational/QUICKSTART.md](conversational/QUICKSTART.md) |
| **Connector** | [connector/README.md](connector/README.md) | [connector/QUICKSTART.md](connector/QUICKSTART.md) |

> **Tip:** Each product's `QUICKSTART.md` is a self-contained, end-to-end walkthrough from setting up your dev environment to testing your extension inside Dragon Copilot.

## 🛠️ Tools

### Dragon Copilot CLI

CLI to easily generate manifests and package integrations for publishing or upload. The CLI supports **Physician** and **Radiologists** Workflows, **Conversational Extensions** and **Clinical Application Connectors**:

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

#### Radiologists Extension Commands

For creating **Radiologists Workflows** that analyze radiology reports and return quality-check recommendations:

```bash
dragon-copilot radiologists init                              # Initialize a new extension project (interactive)
dragon-copilot radiologists generate --template quality-check # Generate a manifest from a template (or use --interactive)
dragon-copilot radiologists validate ./extension.yaml         # Validate extension manifest
dragon-copilot radiologists package                           # Package for distribution
```

#### Conversational Extension Commands (Public Preview)

For creating **Conversational Extensions** (MCP, OpenAPI, Copilot Studio) using manifest schema `0.4.0-preview.2`:

```bash
dragon-copilot conversational init --type MCP              # Create a new extension.yaml
dragon-copilot conversational generate --template openapi  # Add a tool (mcp | openapi | copilot-studio, or --interactive)
dragon-copilot conversational validate ./extension.yaml    # Validate extension manifest
dragon-copilot conversational package                      # Package for distribution
```

#### Connector Commands

For creating **Clinical Application Connectors** (EHR integrations, API connectors):

```bash
dragon-copilot connector init       # Initialize a new connector project
dragon-copilot connector generate --interactive # Generate or update connector manifest
dragon-copilot connector validate   # Validate connector manifest
dragon-copilot connector package    # Package for distribution
```

See the [CLI README](tools/dragon-copilot-cli/README.md) for detailed options, advanced usage, and release instructions. Connector partners can use the [Connector documentation](connector/README.md) and [Quickstart](connector/QUICKSTART.md) to prepare answers for every wizard question.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
