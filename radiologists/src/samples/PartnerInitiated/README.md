[← Radiologists product overview](../../../README.md)

# Dragon Copilot Radiologists Extension Samples (partnerInitiated)

This folder contains samples for the `partnerInitiated` tool type, where your system generates a
result on its own schedule and posts it to Dragon Copilot.

The other direction, where Dragon Copilot calls your endpoint and waits for the response, is
`contractBased`. Those samples live in [`../ContractBased`](../ContractBased/README.md), and a
single manifest can declare tools of both types.

## What is here

|                                                                                      | Purpose                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`submit-pre-draft-report.http`](./submit-pre-draft-report.http)                     | Makes the call. The request, plus three deliberate failures worth running once. |
| [`PreDraftReport.Console.QuickStart`](./PreDraftReport.Console.QuickStart/README.md) | Checks a payload offline and prints the JSON body. `net10.0`, cross-platform.   |

Start with the checker while you are building your generator, then use the `.http` file once you
have an environment and a token.

## Solution

[`SampleExtension.Radiologists.PreDraftReport.slnx`](./SampleExtension.Radiologists.PreDraftReport.slnx)
contains the sample plus the shared
[`Dragon.Copilot.Radiologists.Models`](../../models/Dragon.Copilot.Radiologists.Models/Dragon.Copilot.Radiologists.Models.csproj)
contract project.

```powershell
dotnet build SampleExtension.Radiologists.PreDraftReport.slnx
```

## Try it without credentials

The quickest way to see the shape of a submission needs no tenant, no environment, and no token.

```powershell
cd PreDraftReport.Console.QuickStart
dotnet run
```

## Extension manifest

[`extension.yaml`](./extension.yaml) declares a single `partnerInitiated` tool with the
`preDraftReportGeneration` capability. Unlike a `contractBased` tool it has no `endpoint`, because
nothing calls you, and no `inputs`, because you are the one supplying the data.

Update `auth.tenantId`, `name`, `description` and `version` for your deployment, or regenerate it
with the CLI:

```bash
dragon-copilot radiologists generate --template pre-draft-report
```

## Contracts

The schemas and examples that govern the payload are in
[`radiologists/partner-initiated`](../../../partner-initiated/README.md):

- `pre-draft-report-ingest-request-schema.json` is the request body
- `pre-draft-report-schema.json` is the report itself, carried as `draftReport`
- `samples/` holds a worked example of each

The C# types under `Dragon.Copilot.Radiologists.Models.PartnerInitiated` mirror those schemas.
