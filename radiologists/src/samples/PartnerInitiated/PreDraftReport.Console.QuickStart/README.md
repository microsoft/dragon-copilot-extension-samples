# Pre-Draft Report Payload Checker

Checks a `DraftReportIngestRequest` and prints the JSON body you would post to Dragon Copilot.

It runs offline. No token, no environment, no network, so you can use it while you are still
building the generator that produces the payload.

To actually make the call, see
[`submit-pre-draft-report.http`](../submit-pre-draft-report.http) in the folder above.

## Running it

```bash
cd radiologists/src/samples/PartnerInitiated/PreDraftReport.Console.QuickStart
dotnet run
```

That checks the bundled example. To check your own payload, pass its path:

```bash
dotnet run -- ./my-report.json
```

Exit code is 0 when the payload is valid and 1 when it is not, so it can gate a build step.

## What it checks

A structural check, not full JSON Schema validation. The service remains the authority and rejects
anything this misses with 400.

`manifestName`, `toolName`, `draftReport.identifier`, `aiSystemInfo.version`,
`imagingStudy.studyUid`, `imagingStudy.accessionNumber` and `reportContent` must be present. The
accession number earns its place because it is how the service finds the order to attach the report
to. The service rejects a submission without one with 400, and one whose accession number matches no
order with 404 and reason `OrderNotFound`.

`publisherId`, `offerId` and `planId` go together: send all three or none. They're recommended for
extensions offered through Microsoft Marketplace; an extension installed as a custom app has none,
so omit them. `manifestName` is always required. A partial triple is rejected here so you do not
spend a round trip on it. See
[Marketplace IDs](../../../../partner-initiated/README.md#marketplace-ids).

Every problem is reported at once rather than stopping at the first.

## Payload

`MockData/pre-draft-report-ingest-request.json` is a copy of the canonical example in
[`radiologists/partner-initiated/samples`](../../../../partner-initiated/samples). The schemas that
govern it are in [`radiologists/partner-initiated`](../../../../partner-initiated).

The models under `Dragon.Copilot.Radiologists.Models.PartnerInitiated` mirror those schemas, so
deserializing into them gives you a compile time check on the shape.

## Building

```bash
dotnet build PreDraftReport.Console.QuickStart.csproj
```

No package dependencies beyond the shared models.
