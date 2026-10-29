[← Radiologists product overview](../../../README.md)

# Dragon Copilot Radiologists Extension Samples (partnerInitiated)

This folder contains the sample for the `partnerInitiated` tool type, where your system generates a
result on its own schedule and posts it to Dragon Copilot.

The other direction, where Dragon Copilot calls your endpoint and waits for the response, is
`contractBased`. Those samples live in [`../ContractBased`](../ContractBased/README.md), and a
single manifest can declare tools of both types.

## What is here

|                                                                                      | Purpose                                                                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [`PreDraftReport.Console.QuickStart`](./PreDraftReport.Console.QuickStart/README.md) | Submits a pre-draft report the way your service does, to a simulated Dragon Copilot endpoint. `net10.0`, cross-platform.        |
| [`extension.yaml`](./extension.yaml)                                                 | The sample's manifest. The console installs it in the simulated environment, as a customer would install your extension.        |

## Solution

[`SampleExtension.Radiologists.PreDraftReport.slnx`](./SampleExtension.Radiologists.PreDraftReport.slnx)
contains the sample, its tests and the shared
[`Dragon.Copilot.Radiologists.Models`](../../models/Dragon.Copilot.Radiologists.Models/Dragon.Copilot.Radiologists.Models.csproj)
contract project.

```powershell
dotnet build SampleExtension.Radiologists.PreDraftReport.slnx
```

## Try it

The sample needs no Dragon Copilot environment and, by default, no credentials.

```powershell
cd PreDraftReport.Console.QuickStart
dotnet run
```

The [console README](./PreDraftReport.Console.QuickStart/README.md) covers configuration,
authentication, and how to get each response Dragon Copilot can return.

## Extension manifest

[`extension.yaml`](./extension.yaml) declares a single `partnerInitiated` tool with the
`preDraftReportGeneration` capability. Unlike a `contractBased` tool it has no `endpoint`, because
nothing calls you, and no `inputs`, because you are the one supplying the data.

Its `name`, `sampleRadiologyExtension`, is the `manifestName` the bundled payload sends. Set
`auth.tenantId` to your Microsoft Entra tenant ID, because submissions must use an access token
issued by that tenant. Update `description` and `version` for your deployment, or regenerate the
manifest with the CLI:

```bash
dragon-copilot radiologists generate --template pre-draft-report -o extension.yaml
```

## Contracts

The schemas and examples that govern the payload are in
[`radiologists/partner-initiated`](../../../partner-initiated/README.md):

- `draft-report-ingest-request-schema.json` is the request body
- `draft-report-schema.json` is the report itself, carried as `draftReport`
- `samples/` holds an example submission, and an example of what Dragon Copilot returns when the
  result is later retrieved

The C# types in the models project's
[`PartnerInitiated`](../../models/Dragon.Copilot.Radiologists.Models/PartnerInitiated/) folder mirror
those schemas.

The endpoint, how a submission is matched, and every response are described in
[Submitting a result](../../../partner-initiated/README.md#submitting-a-result). Partner identity setup
and token acquisition are in [Authentication](../../../partner-initiated/authentication.md).

## Samples in other languages

This sample is written in C#, but the same contract works in any language. To scaffold an
equivalent client in Python, Go, Java, Node.js, TypeScript, or Rust, use the reusable Copilot
prompt:

1. Open the repo in VS Code with GitHub Copilot Chat enabled.
2. In Copilot Chat, type `/` and select `radiologists-scaffold-partner-initiated-sample`.
3. Provide the target language when prompted, then review and run the generated sample.

The prompt lives at
[`.github/prompts/radiologists-scaffold-partner-initiated-sample.prompt.md`](../../../../.github/prompts/radiologists-scaffold-partner-initiated-sample.prompt.md).
The generated sample sends the same request as this one, but submits to a minimal simulated
endpoint that returns only some of Dragon Copilot's responses.
