# Pre-draft report console sample

This console app does what your service does after your model generates a draft report: it acquires an access token, submits the draft report to Dragon Copilot, and handles the response.

It submits to a simulated Dragon Copilot endpoint built into the app, so it runs without a Dragon Copilot environment and, by default, without credentials. The simulator checks a submission in the same order as Dragon Copilot and returns the same status codes, reasons and response bodies. See [What the simulator doesn't do](#what-the-simulator-doesnt-do) for the differences.

> [!NOTE]
> **How the simulation works**
>
> - There's no separate server. The app's `HttpClient` uses [`SimulatedDragonCopilotHandler`](Simulation/SimulatedDragonCopilotHandler.cs), a hard-coded [HTTP message handler](https://learn.microsoft.com/dotnet/api/system.net.http.httpmessagehandler) that acts like middleware for outgoing calls.
> - The handler intercepts each request to Dragon Copilot, checks it the way Dragon Copilot does, and returns the response Dragon Copilot would send. The request never leaves the console app.
> - Authentication isn't simulated. When it's on, the token request goes to Microsoft Entra ID, and the handler only checks that a bearer token is present. See [What the simulator doesn't do](#what-the-simulator-doesnt-do) for what Dragon Copilot checks.
> - Your own service doesn't need the handler: create the `HttpClient` without it, with the base URL that Microsoft provides for the environment.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Optional: the [`dragon-copilot` CLI](../../../../../tools/dragon-copilot-cli/README.md), to generate and validate your own manifest
- Optional: a Partner app registration, to try authentication. See [Authentication](../../../../partner-initiated/authentication.md).

## Run it

```bash
cd radiologists/src/samples/PartnerInitiated/PreDraftReport.Console.QuickStart
dotnet run
```

The console describes the simulated environment, submits the bundled draft report and prints the response:

```text
Simulated Dragon Copilot environment
  Customer tenant: 11111111-1111-1111-1111-111111111111
  Environment:     22222222-2222-2222-2222-222222222222
  Installed:       sampleRadiologyExtension (Marketplace offer 101/202/303) from .../extension.yaml
  Orders:          ACC-0000001
  Stored results:  .../Temp/PreDraftReport.Console.QuickStart/stored-results.txt

Submitting .../MockData/pre-draft-report-ingest-request.json
  POST /api/v1/tenants/11111111-1111-1111-1111-111111111111/environments/22222222-2222-2222-2222-222222222222/draft-report-ai-results
  x-ms-correlation-id: 432de2f5-820b-4861-8232-a59aadd38878

200 OK
  x-ms-correlation-id: 432de2f5-820b-4861-8232-a59aadd38878
  Stored. Dragon Copilot shows the draft when the radiologist opens the order with accession number ACC-0000001.
```

Run it again and the response is `409 Conflict` with reason `ResultAlreadyStored`, because a result with the same `draftReport.identifier` is already stored. Resubmitting an identifier never stores the draft twice, which is what makes a retry safe.

To submit your own payload, pass its path:

```bash
dotnet run -- ./my-report.json
```

The exit code is 0 when the draft report is stored or was already stored, and 1 otherwise.

## How it works

| Path | What it does |
| --- | --- |
| `Program.cs` | Loads the payload, acquires a token when authentication is on, submits the draft report and reports the outcome. |
| `Submission/DraftReportClient.cs` | Sends the `POST` with the JSON body, the bearer token and an `x-ms-correlation-id` header, then reads the status, `reason` and correlation ID. |
| `Authentication/` | `ITokenProvider`, and an implementation that uses MSAL and the OAuth 2.0 client credentials flow. |
| `MockData/pre-draft-report-ingest-request.json` | A copy of the [canonical example](../../../../partner-initiated/samples/PreDraftReportGeneration-Ingest-Request-Example.json). Your service builds this body from its model's output. |
| `Simulation/` | The simulated Dragon Copilot endpoint. Your own service doesn't need it. It sends the same request to the base URL that Microsoft provides for the environment. |

The request and response are described in [Submitting a result](../../../../partner-initiated/README.md#submitting-a-result).

## Your manifest

Dragon Copilot finds your extension through the manifest a customer installed. The simulator works the same way: each entry in `Simulation:Installations` is an extension installed in the simulated environment, read from its manifest file.

By default, the installed manifest is the sample's [`extension.yaml`](../extension.yaml), which the build copies next to the app. To use your own:

1. Generate a manifest with the CLI, then validate it:

   ```bash
   cd radiologists/src/samples/PartnerInitiated
   dragon-copilot radiologists generate --template pre-draft-report -o extension.yaml
   dragon-copilot radiologists validate ./extension.yaml
   ```

   The CLI asks for your Partner tenant ID and writes it to the manifest's `auth.tenantId`. It replaces the sample's `extension.yaml`, so the next `dotnet run` installs your manifest. To keep your manifest somewhere else, set `Simulation:Installations:0:ManifestPath` to its full path.

2. Keep `auth.tenantId` set to your Partner tenant ID. Dragon Copilot only accepts a submission whose access token was issued by that tenant. The simulator doesn't check it.

3. Make the payload match the manifest:

   - `manifestName` equals the manifest's `name`.
   - `toolName` equals the `name` of a tool whose `toolType` is `partnerInitiated` and whose `capability` is `preDraftReportGeneration`.

If the manifest is missing or can't be read, the console reports it as not installed, and the submission gets `404 Not Found` with reason `ExtensionNotFound`, as it would if no customer had installed your extension.

In a real deployment, you package the manifest with `dragon-copilot radiologists package`, and a customer installs your extension in one of their environments.

## Configuration

Settings are in `appsettings.json`. Any setting can be overridden with an environment variable, for example `DragonCopilot__EnvironmentId`.

| Setting | Description |
| --- | --- |
| `DragonCopilot:CustomerTenantId`, `DragonCopilot:EnvironmentId` | The customer environment to submit to. They form the route. |
| `DragonCopilot:TimeoutSeconds` | How long to wait for a response. |
| `Authentication:Enabled` | Whether to acquire an access token and send it. Off by default. |
| `Authentication:TenantId`, `Authentication:ClientId` | Your Partner tenant ID and Partner app registration's application (client) ID. |
| `Authentication:ClientSecret` | The Partner app registration's client secret. Set it with user secrets, never in `appsettings.json`. |
| `Simulation:CustomerTenantId`, `Simulation:EnvironmentId` | The customer environment the simulator pretends to be. |
| `Simulation:Installations` | The extensions installed in it. Each has a `ManifestPath` and, for an extension purchased from Microsoft Marketplace, its `PublisherId`, `OfferId` and `PlanId`. Leave the three IDs empty for an extension uploaded as a custom app. |
| `Simulation:Orders` | The accession numbers of its orders. |
| `Simulation:StoredResultsPath` | The file that remembers stored results between runs. Defaults to a file in your temp folder. |

## Authentication

Authentication is off by default, and the simulator then accepts a submission without a token. To acquire a real token with your Partner app registration, set it up as described in [Authentication](../../../../partner-initiated/authentication.md), then from this folder:

```bash
dotnet user-secrets set "Authentication:ClientSecret" "<client-secret>"
```

In `appsettings.json`, set `Authentication:Enabled` to `true`, and set `Authentication:TenantId` and `Authentication:ClientId`.

The console then acquires an app-only token for the Partner Communications API and sends it as a bearer token. A short-lived client secret is enough to try this; delete it when you're done, because it isn't an acceptable long-term credential. In production, use a federated credential, or a certificate where federation isn't available, by replacing `ClientCredentialsTokenProvider` with your own `ITokenProvider` implementation where `Program.cs` creates it.

## Try each response

The console prints the status, `reason`, correlation ID, response body and a hint for each failure. Every response is described in [Responses](../../../../partner-initiated/README.md#responses).

| Response | How to get it |
| --- | --- |
| `200 OK` | Run with the default settings. |
| `409` `ResultAlreadyStored` | Run again without changing `draftReport.identifier`. |
| `404` `OrderNotFound` | Change `draftReport.imagingStudy.accessionNumber` to a number that isn't in `Simulation:Orders`. |
| `409` `MultipleOrdersMatched` | List the accession number twice in `Simulation:Orders`. |
| `404` `ExtensionNotFound` | Change `manifestName`, point `ManifestPath` at a file that doesn't exist, or clear the installation's Marketplace IDs while the payload still sends them. |
| `409` `MultipleExtensionsMatched` | Add a second installation of the same manifest to `Simulation:Installations`. |
| `404` `ToolNotFound` | Change `toolName`, or the tool's `toolType` or `capability` in the manifest. |
| `404` `EnvironmentNotFound` | Change `DragonCopilot:EnvironmentId`. |
| `400 Bad Request` | Remove a required field such as `draftReport.identifier`, or send `publisherId` without `offerId` and `planId`. |

## Start over

Stored results are remembered between runs, as they are in a real environment. To submit the same draft report again, give it a new `draftReport.identifier`, or delete the stored results file the console prints.

## What the simulator doesn't do

- It doesn't validate the access token. When authentication is on, it only checks that a bearer token is present. Dragon Copilot also validates the token, its `AiFindingsWriters` permission, and that its tenant matches the manifest's `auth.tenantId`.
- For `400 Bad Request`, the status, title and error keys match Dragon Copilot, but the wording of an individual message can differ.
- It doesn't store or show the draft report. It only remembers each stored `draftReport.identifier`.

## Tests

```bash
cd radiologists/src/samples/PartnerInitiated
dotnet test SampleExtension.Radiologists.PreDraftReport.slnx
```
