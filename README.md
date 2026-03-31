
# Dragon Copilot Extension Samples

Welcome! This repository contains sample code illustrating the Dragon Copilot extension. Each sample is a self-contained extension that explains one topic in Dragon Copilot extensibility. You can read, play with or adapt from these samples to create your own extensions.

## 📚 Contents

- [Dragon Copilot Extension Samples](#dragon-copilot-extension-samples)
  - [📚 Contents](#-contents)
  - [📝 Overview](#-overview)
  - [🚀 Quick Start](#-quick-start)
    - [1. Clone \& Start (Windows)](#1-clone--start-windows)
  - [📦 Samples](#-samples)
  - [🛠️ Tools](#️-tools)
    - [Dragon Copilot CLI](#dragon-copilot-cli)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)

## 📝 Overview

This repo includes:

- Sample **Physician Workflow** with best practices
- CLI tools to initialize & package both **Extensions** and **Clinical Application Connectors**
- [Additional Documentation](doc/)

### Extensions vs. Clinical Application Connectors

| Type | Description | Use Case |
|------|-------------|----------|
| **Physician Workflow** | Custom AI-powered extensions with automation scripts, event triggers, and dependencies | Extend Dragon Copilot with custom clinical data processing |
| **Clinical Application Connector** | EHR integrations and API connectors that interface with clinical applications | Connect Dragon Copilot to external clinical systems |

## 🚀 Quick Start
Look here for a guide describing the process from downloading code to testing it in Dragon Copilot: [QUICKSTART.md](/QUICKSTART.md)
### 1. Clone & Start (Windows)

```powershell
git clone <your-repo-url>
cd dragon-copilot-extension-samples
```

## 📦 Samples

| Sample Name  | Description  | Location |
|--------------|------------- |----------|
| Physician Workflow | C# Asp.Net WebApplication showing Dragon workflow extension API Contract | [SampleExtension.Web](./samples/DragonCopilot/Workflow/SampleExtension.Web/) |
| Audio Samples | Synthetic audio recordings of clinical encounters | [Audio-Recordings](./samples/audio-recordings/) |

## 🛠️ Tools

### Dragon Copilot CLI

CLI to easily generate manifests and package integrations for publishing or upload. The CLI supports two types of integrations:

#### Installation

```bash
cd tools/dragon-copilot-cli
npm install
npm run build
npm link
```

#### Physician Extension Commands

For creating **Physician Workflows** with automation scripts, event triggers, and dependencies:

```bash
dragon-copilot physician init       # Initialize a new extension project
dragon-copilot physician generate   # Generate or update extension manifest
dragon-copilot physician validate   # Validate extension manifest
dragon-copilot physician package    # Package for distribution
```

#### Connector Commands

For creating **Clinical Application Connectors** (EHR integrations, API connectors):

```bash
dragon-copilot connector init       # Initialize a new connector project
dragon-copilot connector generate   # Generate or update connector manifest
dragon-copilot connector validate   # Validate connector manifest
dragon-copilot connector package    # Package for distribution
```

See [CLI README](tools/dragon-copilot-cli/README.md) for detailed options and advanced usage.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
