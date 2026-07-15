[← Radiologists product overview](../../../README.md)

# Dragon Copilot — Radiologists Extension Samples (Workflow)

This folder contains ASP.NET Core sample projects that demonstrate the
partner extension pattern for Dragon Copilot.

| Project                                                                                                      | Purpose                                                                                                              | Default port (http/https) | Target                                                                |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| [`SampleExtension.Radiologists.Web.Quickstart`](./SampleExtension.Radiologists.Web.Quickstart/README.md)     | Returns a canned response loaded from `MockData/qualitycheck-response.json`. No model inference, no AI dependencies. | 5080 / 7080               | `net10.0` (cross-platform)                                            |
| [`SampleExtension.Radiologists.Web.Ai`](./SampleExtension.Radiologists.Web.Ai/README.md)                     | AI-powered quality checks via **Azure OpenAI** (cloud).                                                              | 5080 / 7080               | `net10.0` (cross-platform)                                            |
| [`SampleExtension.Radiologists.Web.Local`](./SampleExtension.Radiologists.Web.Local/README.md) | AI-powered quality checks via **Foundry Local** (on-device).                                                         | 5080 / 7080               | `net10.0-windows10.0.26100` (**Windows-only**, Foundry Local / WinML) |

## Solution

[`SampleExtension.Radiologists.Web.slnx`](./SampleExtension.Radiologists.Web.slnx)
contains the sample projects plus the shared
[`Dragon.Copilot.Radiologists.Models`](../../models/Dragon.Copilot.Radiologists.Models/Dragon.Copilot.Radiologists.Models.csproj)
contract project.

## Build everything

```powershell
dotnet build SampleExtension.Radiologists.Web.slnx
```

## Run a sample

```powershell
# Stub-only (mock data)
dotnet run --project SampleExtension.Radiologists.Web.Quickstart

# AI-backed, cross-platform (Azure OpenAI)
dotnet run --project SampleExtension.Radiologists.Web.Ai

# AI-backed, on-device (Foundry Local — Windows-only)
dotnet run --project SampleExtension.Radiologists.Web.Local
```

## Extension manifest

All Radiologists Workflow samples implement the **same** extension contract, so they
share one manifest: [`extension.yaml`](./extension.yaml). It declares the
`qualityCheck` tool, its inputs and outputs, and the endpoint
(`http://localhost:5080/v1/process`), and it's what you register with Dragon
Copilot so it can call your extension. Update `endpoint` and `auth.tenantId` for
your deployment, along with `name`, `description`, `version`, and the optional
`relevanceFilteringCriteria`, or regenerate it with the CLI:

```bash
dragon-copilot radiologists generate --template quality-check
```

## Samples in other languages

These samples are written in C#, but the same wire contract works in any
language. To scaffold an equivalent sample in Python, Go, Java, Node.js,
TypeScript, or Rust, use the reusable Copilot prompt:

1. Open the repo in VS Code with GitHub Copilot Chat enabled.
2. In Copilot Chat, type `/` and select `radiologists-scaffold-language-sample`.
3. Provide the target language when prompted, then review and run the generated sample.

The prompt lives at
[`.github/prompts/radiologists-scaffold-language-sample.prompt.md`](../../../../.github/prompts/radiologists-scaffold-language-sample.prompt.md)
and mirrors the C# Quickstart's contract, structure, and tests.
