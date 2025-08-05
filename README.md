
# Dragon Copilot Extension Samples

Welcome! This repository contains sample code illustrating the Dragon Copilot extension. Each sample is a self-contained extension that explains one topic in Dragon Copilot extensibility. You can read, play with or adapt from these samples to create your own extensions.

## 📚 Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Samples](#-samples)
- [Tools](#️-tools)
- [Contributing](#-contributing)
- [License](#-license)

## 📝 Overview

This repo includes:

- Sample extension with best practices
- CLI tools to initialize & package extension
- [Additional Documentation](doc/)

## 🚀 Quick Start

### 1. Clone & Start (Windows)

```powershell
git clone <your-repo-url>
cd dragon-copilot-extension-samples
```

## 📦 Samples

| Sample Name  | Description  | Location |
|--------------|------------- |----------|
| Workflow Extension | C# Asp.Net WebApplication showing Dragon workflow extension API Contract | [SampleExtension.Web](./samples/DragonCopilot/Workflow/SampleExtension.Web/) |

## 🛠️ Tools

### Dragon Extension CLI

CLI to easily generate manifest & package the extension, getting ready to publish or upload the extension.

Quick usage:

```bash
cd tools/dragon-extension-cli
npm run build
npm link
dragon-extension init
dragon-extension package
```

See [CLI README](tools/dragon-extension-cli/README.md) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
