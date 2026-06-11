[← Radiology product overview](../../../README.md)

# Dragon Copilot — Radiology Extension Samples (Workflow)

This folder contains ASP.NET Core sample projects that demonstrate the
partner extension pattern for Dragon Copilot.

| Project                                                                                            | Purpose                                                                                                              | Default port (http/https) | Target                                                                |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| [`SampleExtension.Radiology.Web.Quickstart`](./SampleExtension.Radiology.Web.Quickstart/README.md) | Returns a canned response loaded from `MockData/qualitycheck-response.json`. No model inference, no AI dependencies. | 5080 / 7080               | `net10.0` (cross-platform)                                            |
| [`SampleExtension.Radiology.Web.Ai`](./SampleExtension.Radiology.Web.Ai/README.md)                 | Uses Azure OpenAI when configured, falls back to an on-device Foundry Local model otherwise.                         | 5080 / 7080               | `net10.0-windows10.0.26100` (Windows-only, required by Foundry Local) |


## Solution

[`SampleExtensions.Radiology.Web.slnx`](./SampleExtensions.Radiology.Web.slnx)
contains the sample projects plus the shared
[`Dragon.Copilot.Radiology.Models`](../../models/Dragon.Copilot.Radiology.Models/Dragon.Copilot.Radiology.Models.csproj)
contract project.

## Build everything

```powershell
dotnet build SampleExtensions.Radiology.Web.slnx
```

## Run a sample

```powershell
# Stub-only (mock data)
dotnet run --project SampleExtension.Radiology.Web.Quickstart

# AI-backed (Azure OpenAI + Foundry Local fallback)
dotnet run --project SampleExtension.Radiology.Web.Ai
```
