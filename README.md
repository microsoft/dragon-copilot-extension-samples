
# Dragon Copilot Extension Samples

Welcome! This repository contains sample code illustrating the Dragon Copilot extension. Each sample is a self-contained extension that explains one topic in Dragon Copilot extensibility. You can read, play with or adapt from these samples to create your own extensions.

## 📚 Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Samples](#-samples)
- [Tools](#️-tools)
- [Contributing](#-contributing)
- [Repository Security](#-repository-security)
- [License](#-license)

## 📝 Overview

This repo includes:

- Sample extension with best practices
- Unified `dragon-copilot-cli` tooling (extension + partner flows)
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

### Dragon Copilot CLI

The `dragon-copilot-cli` consolidates both the legacy extension and partner CLIs. It now generates **manifest version 3** files with support for automation scripts, event triggers, and dependency metadata.

Quick usage:

```bash
cd tools/dragon-copilot-cli
npm install
npm run build
npm link
dragon-copilot extension init
dragon-copilot partner validate ./path/to/integration.yaml
```

See [tools/dragon-copilot-cli/README.md](tools/dragon-copilot-cli/README.md) for more details, including an automation script scaffolding HOWTO.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

All pull requests require review before merging to main. See the [Branch Protection Guide](doc/BRANCH_PROTECTION.md) for details on repository security settings.

## 🔒 Repository Security

This repository uses branch protection rules and code owners to maintain code quality:

- **Pull Request Reviews Required**: All changes to `main` must go through a reviewed pull request
- **Code Owners**: The `.github/CODEOWNERS` file automatically assigns reviewers
- **CI/CD Checks**: All tests and security scans must pass before merging

For setup instructions, see [Branch Protection Setup Guide](doc/BRANCH_PROTECTION.md).

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
