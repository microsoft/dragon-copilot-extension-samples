# `partnerInitiated` tools

For a **`partnerInitiated`** tool, the Partner calls Dragon Copilot Radiologists to submit results rather than being called by Dragon Copilot.

See [Two tool types](../README.md#two-tool-types) in the radiologists README for how this compares with `contractBased`.

## What a Partner builds

A client application or service that submits draft reports to Dragon Copilot through the [submission endpoint](#submitting-a-result). Dragon Copilot stores each draft and displays it when the radiologist opens the order.

Because Dragon Copilot does not call the Partner, there is no endpoint to expose or extensibility API to implement.

## Integration steps

1. Build a manifest that defines a `partnerInitiated` tool with the `preDraftReportGeneration` capability; `auth.tenantId` must be set to your Microsoft Entra tenant ID. See [Declaring the tool](#declaring-the-tool).
2. Set up a Partner app registration in that tenant, so your service can get the access tokens it submits results with. See [Authentication](authentication.md).
3. A customer installs your extension in one of their environments.
4. After processing the study, POST the draft report back to the customer's environment, with the study's accession number in the report. See [Submitting a result](#submitting-a-result).
5. When the radiologist opens the order, Dragon Copilot shows the stored draft. Your service isn't called.

## Declaring the tool

Consider the following sample manifest defining an extension with a single `partnerInitiated` tool:

```yaml
name: sampleRadiologyExtension
description: Sample extension providing pre-draft radiology report generation
version: 1.0.0
radiologistsExtensibilityApiVersion: 1.0.0
auth:
  tenantId: 00000000-0000-0000-0000-000000000000
tools:
  - name: preDraftReportGeneratorTool
    toolType: partnerInitiated
    capability: preDraftReportGeneration
    description: Tool to generate a pre-draft radiology report
    outputs:
      - name: preDraftReportResult
        description: Pre-draft radiology report
        content-type: application/vnd.ms-dragon.rad.draft-report+json
        schemaVersion: "1.0"
```

- `auth.tenantId` should be your Microsoft Entra tenant ID. Results must be submitted with an access token issued by your tenant. See [Authentication](#authentication).
- A `partnerInitiated` tool omits `endpoint` and `inputs`, since neither is used, and declares only what it produces. The manifest schema requires `endpoint` and `inputs` when `toolType` is `contractBased`, and rejects them when it's `partnerInitiated`.
- Each capability produces one output type, so a `preDraftReportGeneration` tool's outputs use `application/vnd.ms-dragon.rad.draft-report+json`.

The [reference manifest](../manifest/extension.yaml) declares this tool alongside a `contractBased` one.

## Submitting a result

```http
POST {baseUrl}/api/v1/tenants/{customerTenantId}/environments/{environmentId}/draft-report-ai-results
```

`{baseUrl}` is the Dragon Copilot (radiologists) API base URL, which Microsoft provides for each environment.

| Route parameter | Description |
| --- | --- |
| `customerTenantId` | The customer's Microsoft Entra tenant ID (GUID). |
| `environmentId` | The ID of the customer environment your extension is installed in (GUID). |

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {access token}`. See [Authentication](#authentication). |
| `x-ms-correlation-id` | Optional. An ID for the request, such as a GUID, of up to 128 characters. |

Every response carries an `x-ms-correlation-id` header: the value you sent, or one Dragon Copilot generated if you didn't send a usable one. Log it, and include it when you contact support.

The JSON body identifies your extension and tool, and carries the draft report. The accession number inside the draft report (`draftReport.imagingStudy.accessionNumber`) is how Dragon Copilot finds the order the draft belongs to.

- Schema: [`draft-report-ingest-request-schema.json`](draft-report-ingest-request-schema.json)
- Example: [`PreDraftReportGeneration-Ingest-Request-Example.json`](samples/PreDraftReportGeneration-Ingest-Request-Example.json)

### How a submission is matched

Dragon Copilot stores a submission only when all of these match:

1. **Environment**: `customerTenantId` and `environmentId` identify a customer environment.
2. **Extension**: an extension installed in that environment has a manifest whose `name` property equals `manifestName` and whose `auth.tenantId` matches the tenant that issued your access token (the token's `tid` claim). If you send [Marketplace IDs](#marketplace-ids), they must match too.
3. **Tool**: that manifest declares a `partnerInitiated` tool named `toolName` with the `preDraftReportGeneration` capability.
4. **Order**: `draftReport.imagingStudy.accessionNumber` matches exactly one order in the environment.

If any of these fails, nothing is stored, and the response's `reason` says which. See [Responses](#responses).

### Marketplace IDs

`publisherId`, `offerId` and `planId` are optional, but strongly recommended for extensions offered through Microsoft Marketplace. They're the publisher, offer and plan IDs of your Microsoft Marketplace offer.

When a customer purchases your extension from Microsoft Marketplace, the installed extension records the offer and plan it was purchased with. An extension the customer uploads as a custom app has no Marketplace IDs.

- **Without them**, your extension is matched by `manifestName` and your token's tenant, whether the customer purchased it or uploaded it as a custom app.
- **With them**, send all three. Your extension matches only if the customer purchased it from Microsoft Marketplace with that offer and plan. A custom app never matches.

### One draft per study and tool (draft idempotency)

Dragon Copilot keeps one result per order and tool. A newer submission for the same accession number and tool replaces the earlier one, so send one complete draft per study.

To replace a draft, submit it again with a new `draftReport.identifier`. Reusing an identifier returns `409` with reason `ResultAlreadyStored`.

### Responses

| Status | Meaning |
| --- | --- |
| `200 OK` | The result was stored. The response has no body. |
| `400 Bad Request` | The request failed validation, for example a body that doesn't match the schema or a route parameter that isn't a GUID. |
| `401 Unauthorized` | The access token is missing or invalid. See [Authentication](authentication.md). |
| `403 Forbidden` | The access token is valid but isn't allowed to submit results. See [Authentication](authentication.md). |
| `404 Not Found` | Something in the request didn't match. See `reason`. |
| `409 Conflict` | The result conflicts with what's stored, or matches more than one order or extension. See `reason`. |
| `500 Internal Server Error` | An unexpected error occurred. |

`404` and `409` responses carry a `reason`. The `message` is the same for every response with that status, so use `reason` to tell the cases apart:

```json
{
  "message": "Resource not found.",
  "reason": "OrderNotFound"
}
```

| Status | `reason` | Meaning |
| --- | --- | --- |
| `404` | `EnvironmentNotFound` | `customerTenantId` and `environmentId` don't identify a customer environment. |
| `404` | `ExtensionNotFound` | No extension installed in the environment matches the **Extension** rule in [How a submission is matched](#how-a-submission-is-matched). |
| `404` | `ToolNotFound` | The manifest declares no `partnerInitiated` tool named `toolName` with the `preDraftReportGeneration` capability. |
| `404` | `OrderNotFound` | No order in the environment has the accession number. |
| `409` | `ResultAlreadyStored` | A result with this `draftReport.identifier` is already stored. |
| `409` | `MultipleOrdersMatched` | More than one order in the environment has the accession number. |
| `409` | `MultipleExtensionsMatched` | More than one of your extensions installed in the environment has this manifest name. If the one you mean was purchased from Microsoft Marketplace, send its [Marketplace IDs](#marketplace-ids). |

A `404` without a `reason` usually means the request URL is wrong and the request never reached the submission endpoint.

## Authentication

Submit with a Microsoft Entra access token issued by the tenant in your manifest's `auth.tenantId`. A token issued by any other tenant won't match your extension, so the submission is rejected.

See [Authentication](authentication.md) for Partner identity setup and token acquisition.

## Report formatting

Each section's `content` is encoded according to `reportContent.structuredReport.format`: `plain_text` or `markdown`.

## Schemas

[`draft-report-ingest-request-schema.json`](draft-report-ingest-request-schema.json) defines the whole request body: how the Partner identifies their extension, plus the report itself. The customer tenant and environment come from the route, and the submitting Partner is identified from the access token, so neither appears in the body.

[`draft-report-schema.json`](draft-report-schema.json) defines the draft report payload alone, at `x-ms-schema-version` **1.0**. This is what the `schemaVersion` on the output above refers to, and what `application/vnd.ms-dragon.rad.draft-report+json` resolves to. The submission schema references it for its `draftReport` member.

## Samples

- [`PreDraftReportGeneration-Ingest-Request-Example.json`](samples/PreDraftReportGeneration-Ingest-Request-Example.json) — what a Partner posts.
- [`PreDraftReportGeneration-Retrieve-Response-Example.json`](samples/PreDraftReportGeneration-Retrieve-Response-Example.json) — what Dragon Copilot returns when the capability is later invoked for that order.

The retrieve response is included because it is not symmetric with the submission. Dragon Copilot is asked what results exist for an exam, without naming a vendor, so the response is a collection and may contain results from several extensions.

Each result comes back as an output with alias `DraftReport`. Its `output` is a JSON string that names who submitted the result (`partnerTenantId`, `extensionName`, `toolName`) and carries the report itself as `draftReport`, which follows [`draft-report-schema.json`](draft-report-schema.json).
