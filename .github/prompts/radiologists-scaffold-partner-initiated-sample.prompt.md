---
description: "Scaffold a Radiologists partnerInitiated pre-draft report client sample in the language of your choice, mirroring the C# console Quickstart."
agent: agent
---

# Scaffold a Radiologists `partnerInitiated` sample in another language

Generate a new Radiologists sample, in the language the user provides, that submits a pre-draft report to Dragon Copilot the way the C# console Quickstart does, and that can be checked into this repository once reviewed. Treat the rest of this file as your working instructions and reference material.

> **Scope:** this prompt scaffolds `partnerInitiated` samples: a client that acquires an access token and posts a pre-draft report to Dragon Copilot. It does **not** cover `contractBased` tools, which expose an endpoint that Dragon Copilot calls. If the user asks for a `contractBased` sample, say so and point them at the `radiologists-scaffold-language-sample` prompt instead.

The C# Quickstart submits to a detailed simulation of Dragon Copilot's submission endpoint. The generated sample is a thin client instead: it submits to a minimal simulated endpoint that returns only a few of the responses, and its README points to the C# Quickstart for the rest.

## Start here — establish the target language and destination

Your first step is to confirm two things — which language to scaffold, and where to generate the sample:

1. **Language.** If the user has already named a language (in their message or via the `${input:language}` variable below), use it. Otherwise, ask the user to choose one of `python`, `go`, `java`, `nodejs`, `typescript`, `rust`, or another language they specify.
2. **Destination folder.** If the user has already given one (in their message or via the `${input:targetFolder}` variable below), use it. Otherwise, ask where to generate the sample and make clear it **defaults to this repository** at `radiologists/src/samples/PartnerInitiated/`. If the user accepts the default (or gives no answer), generate in-repo exactly as described under **Folder and naming conventions**. If the user supplies a different folder, generate there and follow the **Generating outside the repository** notes.

Ask for whatever is still unknown in a single short reply — combine the language and destination questions if both are missing — then wait for the answer. Begin reading the source material and scaffolding only once both are known.

## How a partner uses this prompt

1. Open the repo in an editor with GitHub Copilot Chat enabled (for example Visual Studio or VS Code).
2. In Copilot Chat, type `/` and select `radiologists-scaffold-partner-initiated-sample`.
3. Provide the target language when asked (for example `python`, `go`, `java`, `nodejs`, `typescript`, `rust`).
4. Choose where to generate it, or accept the default (this repository, under `radiologists/src/samples/PartnerInitiated/`).
5. Review, run, and adjust before committing.

## Input

- `${input:language:Target language for the new sample (e.g. python, go, java, nodejs, typescript, rust)}`
- `${input:targetFolder:Destination folder for the sample — press Enter to default to radiologists/src/samples/PartnerInitiated/ in this repo}`

## Source material to read first

1. **`radiologists/partner-initiated/README.md` is the canonical contract.** Its **Submitting a result** section defines the endpoint, the headers, how a submission is matched, and every status code and `reason`. Read it first.
2. **`radiologists/partner-initiated/authentication.md`** covers the Partner app registration and the token rules: a tenant-specific authority, the Partner Communications API `/.default` scope, and one confidential client reused for its token cache.
3. **The C# console Quickstart shows the canonical client.** Read it end to end, under `radiologists/src/samples/PartnerInitiated/PreDraftReport.Console.QuickStart/`:
    - `Program.cs`: the run steps, the console output, the reason hints and the exit codes
    - `Submission/DraftReportClient.cs` and `Submission/SubmissionResult.cs`: the request, and how the response is read
    - `Authentication/ITokenProvider.cs` and `Authentication/ClientCredentialsTokenProvider.cs`: the token seam and its client credentials implementation
    - `SampleSettings.cs` and `appsettings.json`: the `DragonCopilot` and `Authentication` settings
    - `Simulation/SimulatedDragonCopilotHandler.cs`: the correlation ID handling and the `401`, `404` and `400` responses that the minimal simulated endpoint reproduces. Don't port the rest of `Simulation/`.
    - `README.md`: the README structure to mirror
4. **`radiologists/src/samples/PartnerInitiated/extension.yaml`** is the manifest that the payload's `manifestName` and `toolName` refer to.
5. **`radiologists/partner-initiated/draft-report-ingest-request-schema.json`** describes the request body. The sample sends the payload file unchanged, so don't mirror the request types in the target language.
6. **Per-language overlay** (load only if it exists for the chosen language): `.github/instructions/<language>-sample.instructions.md`. If it has a **Client samples** section, follow that section strictly; its server sections don't apply.

## Wire contract (lock this down — non-negotiable)

This section reflects `radiologists/partner-initiated/README.md` and the C# Quickstart exactly. **Do not rename the route, the headers or the `reason` values.**

**Request:**

    POST {baseUrl}/api/v1/tenants/{customerTenantId}/environments/{environmentId}/draft-report-ai-results
    Content-Type: application/json
    Authorization: Bearer {access token}      // Only when authentication is on
    x-ms-correlation-id: {new GUID}           // A new one for each submission

    {payload file, sent unchanged}

- Escape `customerTenantId` and `environmentId` as path segments.
- Send the payload file's JSON as it is. Don't add, drop or rename fields; a partner's service builds this body from its model's output.

**Response:** read three things from every response.

- The status code.
- The `x-ms-correlation-id` response header.
- The `reason`, which `404` and `409` responses carry in a `{"message": "...", "reason": "..."}` body. Read it only when the response's media type is `application/json` and the body is a JSON object with a string `reason`. The `message` is the same for every response with that status, so `reason` is what tells the cases apart.

| Status | Meaning |
| --- | --- |
| `200` | Stored. The body is empty. |
| `400` | The request failed validation. The body is problem details (`application/problem+json`). |
| `401`, `403` | The access token is missing, invalid or not allowed to submit results. |
| `404`, `409` | Something didn't match, or conflicts with what's stored. See `reason`. A `404` without a `reason` means the URL is wrong. |
| `500` | An unexpected error occurred. |

**Exit code:** `0` when the draft report was stored (`200`) or was already stored (`409` with reason `ResultAlreadyStored`); `1` otherwise.

## Folder and naming conventions

By default the sample is generated in this repository at `radiologists/src/samples/PartnerInitiated/<folder-name>/`. If the user chose a different destination (see **Start here**), create `<folder-name>/` under that destination instead. The folder name **reads as** "pre-draft report `<language>` quickstart" using the **language's idiomatic package-naming convention** (snake_case for Python/Rust, kebab-case for Node/TypeScript/Go/Java), for example `pre_draft_report_python_quickstart`.

Use the same lowercase language token (`python`, `nodejs`, `typescript`, `go`, `java`, `rust`) consistently in code (namespaces, packages, module names). Where the language's overlay sets the package or module names, such as Python's `app` package, follow the overlay. Do not introduce a separate PascalCase variant. Title the README `Pre-draft report <Language> sample`, for example `Pre-draft report Python sample`.

### Generating outside the repository

The in-repo default relies on files near the sample: the shared manifest (`radiologists/src/samples/PartnerInitiated/extension.yaml`) and the contract (`radiologists/partner-initiated/`). Always read that source material from **this repo** (that's where the prompt runs), but when the destination is **outside** the repo, keep the generated sample self-contained:

- Copy `radiologists/src/samples/PartnerInitiated/extension.yaml` into the sample folder, and point the README at the copy instead of `../extension.yaml`. (This is the one case where a per-sample manifest is expected.)
- Replace repo-relative links and paths, in the README and in console messages such as the `401` hint, with absolute URLs under `https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/`, since those targets won't exist at the destination. Instead of a `cd` into the repository, say to run the commands from the sample folder.
- Everything else — wire contract, settings, simulated endpoint, tests — is unchanged.

## What the sample must do

### Client

1. **Settings.** Read the same settings as the C# Quickstart's `appsettings.json` from these environment variables, using a language-idiomatic config layer:

    | Setting | Environment variable | Default |
    | --- | --- | --- |
    | `DragonCopilot.CustomerTenantId` | `DCR_RAD_DRAGON_COPILOT__CUSTOMER_TENANT_ID` | `11111111-1111-1111-1111-111111111111` |
    | `DragonCopilot.EnvironmentId` | `DCR_RAD_DRAGON_COPILOT__ENVIRONMENT_ID` | `22222222-2222-2222-2222-222222222222` |
    | `DragonCopilot.TimeoutSeconds` | `DCR_RAD_DRAGON_COPILOT__TIMEOUT_SECONDS` | `30` |
    | `Authentication.Enabled` | `DCR_RAD_AUTHENTICATION__ENABLED` | `false` |
    | `Authentication.TenantId` | `DCR_RAD_AUTHENTICATION__TENANT_ID` | Empty |
    | `Authentication.ClientId` | `DCR_RAD_AUTHENTICATION__CLIENT_ID` | Empty |
    | `Authentication.ClientSecret` | `DCR_RAD_AUTHENTICATION__CLIENT_SECRET` | Empty |
    | `Simulation.StoredResultsPath` | `DCR_RAD_SIMULATION__STORED_RESULTS_PATH` | `stored-results.txt` in a folder named `<folder-name>` in the system temp folder |

    The client secret comes from an environment variable or a git-ignored local file, never from a committed file. A relative `StoredResultsPath` resolves against the sample folder, and an empty one means the default. Don't add a base URL setting: like the C# Quickstart, the sample only submits to the simulated endpoint.

2. **Run steps.** Mirror `Program.cs`, in this order:
    1. When authentication is on and any of `TenantId`, `ClientId` or `ClientSecret` is empty, print `Authentication is enabled, but these settings are empty: <names>.`, where `<names>` lists the empty settings' environment variable names in that order, separated by commas, and exit with `1`.
    2. Load the payload: the path in the first command-line argument, resolved against the working directory, or by default the bundled mock payload, resolved against the sample folder. Use and print the full path. If it can't be read, print `Payload not found: <path>` or `Payload is not valid JSON: <error>` and exit with `1`. Any valid JSON is sent as it is; the simulated endpoint answers a body that isn't an object with `400`.
    3. When authentication is on (a token provider was passed), acquire a token (see item 3). On failure, print `Could not acquire an access token. <error code>: <message>` and exit with `1`. On success, print `Acquired an access token for the Partner Communications API.` Never print the token.
    4. Print `Simulated Dragon Copilot endpoint`, then `  Stored results:  <stored-results path>` and a blank line, then submit (see item 4).
    5. Print the outcome (see item 5).

    Step 1 belongs to the entry point (`main`), which reads the settings, checks them, creates the token provider when authentication is on, and calls a run function for steps 2 to 5. The run function takes the settings, the payload path, where to write output, an optional token provider and an optional HTTP transport (the simulated endpoint by default), and returns the exit code, so the tests can drive it the way they drive the C# `Program.RunAsync`. Inside the run function, authentication is on exactly when a token provider is passed; it doesn't read `Authentication.Enabled`.

3. **Token acquisition.** Put it behind a small seam (an interface, protocol or function type) with one implementation that uses the OAuth 2.0 client credentials flow with a client secret:
    - Authority `https://login.microsoftonline.com/<Authentication.TenantId>`.
    - Scope `7c2215ec-e1fa-4aa6-9204-8ee91e63d29f/.default`, the Partner Communications API.
    - Create the confidential client once and reuse it, so its token cache is used.
    - Report any failure as a failed acquisition (run step 3), including an exception the library throws while creating the client or acquiring the token. Use the library's error code when it gives one, otherwise the exception's type name.
    - Use the language's MSAL library where Microsoft publishes one (Python `msal`, Node.js/TypeScript `@azure/msal-node`, Java `msal4j`, Go `github.com/AzureAD/microsoft-authentication-library-for-go`). Otherwise use the Azure Identity library's client secret credential, and note the choice in the README.
    - Comment that a client secret is for trying the sample only, and that production should use a federated credential, or a certificate where federation isn't available, by replacing this implementation.

4. **Submission.** Send the request in the wire contract through an HTTP client whose base URL is `https://dragon-copilot.simulated.invalid/` (the host is never contacted) and whose transport is the simulated endpoint, in process. Use the HTTP client's pluggable transport (for example Python `httpx.MockTransport`, a Go `http.RoundTripper`, or an injected `fetch` in Node.js/TypeScript); only where the standard client has no such seam, serve the simulated endpoint on an ephemeral localhost port. Apply `DragonCopilot.TimeoutSeconds`, with a minimum of 1 second. Before sending, print:

        Submitting <payload path>
          POST /api/v1/tenants/<CustomerTenantId>/environments/<EnvironmentId>/draft-report-ai-results
          x-ms-correlation-id: <correlation ID>

    If the request fails, print `The request failed: <error>`; if it times out, print `No response within <n> seconds.` Exit with `1` in both cases.

5. **Outcome.** Mirror `Report` in the C# `Program.cs`, and copy its messages and reason hints verbatim:
    - A blank line, then `<status code> <reason phrase>` with the standard HTTP reason phrase (for example `404 Not Found`), followed by `, reason <reason>` when there is one, then `  x-ms-correlation-id: <response header>`, with nothing after the colon when the response has no such header.
    - `200`: the `Stored. Dragon Copilot shows the draft…` line, with the accession number from `draftReport.imagingStudy.accessionNumber`. Exit with `0`.
    - `409` with reason `ResultAlreadyStored`: the `A result with draftReport.identifier … is already stored…` line. Exit with `0`.
    - Anything else: the response body when it isn't empty, then the hint for its `reason` (the C# `ReasonHints` table), or the authentication hint for `401`. Exit with `1`.

    Read the accession number and the identifier defensively. The simulated endpoint accepts a payload without an accession number, so print `(not set)` in place of a missing value.

### Minimal simulated endpoint

6. Keep the simulated endpoint in its own file or module, separate from the client code, so a partner can delete it. The run function creates it to require a token when a token provider is passed. It handles a request in this order, and does nothing else:
    1. When it requires a token and the request has no `Authorization: Bearer <non-empty token>` header: `401` with a `WWW-Authenticate: Bearer` header and no body. This check comes before routing.
    2. When the path isn't `api/v1/tenants/{customerTenantId}/environments/{environmentId}/draft-report-ai-results` with non-empty IDs (segments compared ignoring case): `404` with no body.
    3. When the body isn't a JSON object whose `draftReport.identifier` is a non-blank string: `400` with `Content-Type: application/problem+json; charset=utf-8` and this body, where `traceId` is `00-<32 hex digits>-<16 hex digits>-00`:

            {
                "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                "title": "One or more validation errors occurred.",
                "status": 400,
                "errors": {
                    "DraftReport.Identifier": ["The Identifier field is required."]
                },
                "traceId": "00-…-…-00"
            }

    4. When that identifier is already stored for the environment in the route (environment IDs compared ignoring case, identifiers exactly): `409` with `Content-Type: application/json` and `{"message": "Request could not be processed.", "reason": "ResultAlreadyStored"}`.
    5. Otherwise: store the identifier and return `200` with no body.

    The endpoint reads the `Simulation.StoredResultsPath` file when it's created, and appends one line per stored result: the environment ID in upper case, a tab, then the identifier. It creates the file's folder if needed. A second run therefore gets `409`, as it would from Dragon Copilot.

    Every response carries an `x-ms-correlation-id` header: the request's value, trimmed, when it is 1–128 characters from `!` to `~` other than `"`, `,`, `;` and `\`; otherwise a new GUID written as 32 hex digits.

### Files & docs

7. **`extension.yaml`:** The `partnerInitiated` samples **share one manifest**, `radiologists/src/samples/PartnerInitiated/extension.yaml`. Don't create a per-sample manifest (except when generating outside the repository); reference it from the README (see item 9).

8. **Mock data:** Copy `radiologists/partner-initiated/samples/PreDraftReportGeneration-Ingest-Request-Example.json` **verbatim** to a top-level `MockData/` folder in the new sample (the C# Quickstart's `MockData/pre-draft-report-ingest-request.json` is the same file). The filename uses the language's idiomatic casing for resource files:
    - Python / Rust → `pre_draft_report_ingest_request.json`
    - Node / TypeScript → `pre-draft-report-ingest-request.json`
    - Java → `preDraftReportIngestRequest.json`
    - Go → `predraftreportingestrequest.json`

9. **README:** Mirror the structure of the C# Quickstart's `README.md`, with these sections:
    - **Prerequisites.**
    - **Run it:** separate Linux/macOS and Windows PowerShell blocks for the single install step and the single run command, the expected output, what a second run returns, how to pass your own payload, and the exit codes.
    - **How it works:** a table of the files, saying a real service doesn't need the simulated endpoint.
    - **Your manifest:** the shared `../extension.yaml`, the CLI `generate` and `validate` commands, and that `manifestName` and `toolName` must match the manifest.
    - **Configuration:** a table of the settings and their environment variable names.
    - **Authentication:** how to turn it on, where to put the secret, and the production credential note. Say that Dragon Copilot always requires a token, and that the default settings work without one only because the simulated endpoint doesn't need it.
    - **Try each response:** `200`, `409` `ResultAlreadyStored` and `400` only.
    - **Start over.**
    - **What the simulated endpoint doesn't do:** it checks only the token's presence, the route and `draftReport.identifier`. It doesn't check the environment, the manifest and tool, the order, the rest of the body, or the token itself. Point to the C# Quickstart for a detailed simulation, and to the **Responses** section of `radiologists/partner-initiated/README.md` for the full list.
    - **Running the tests.**

### Validation

10. **Tests:** Ship a test suite using the language's standard test framework. The tests must not call Microsoft Entra ID or the network, must not read the developer's own environment variables or settings file, and each uses its own stored-results file. Required cases:
    - The bundled payload gets `200` and exit code `0`. The request carried `Content-Type: application/json` and an `x-ms-correlation-id`, which the response echoes.
    - Submitting the same payload again gets `409` with reason `ResultAlreadyStored` and exit code `0`.
    - A blank `draftReport.identifier` gets `400` with the `DraftReport.Identifier` error and exit code `1`.
    - A simulated endpoint that requires a token returns `401` to a request without one. With a fake token provider, the run sends `Authorization: Bearer <token>` and gets `200`.
    - With authentication on and an empty setting, the entry point exits with `1`, names the empty settings, and submits nothing: its output has no `Submitting` line.
    - A response the simulated endpoint doesn't produce, such as `404` with reason `OrderNotFound` from a stub transport, is read correctly: its reason and hint are printed and the exit code is `1`. A `404` with no body has no reason.
    - A missing payload file, and one that isn't valid JSON, exit with `1`.
    - The simulated endpoint generates a 32-hex-digit correlation ID when the request has none, or has one with a character it doesn't accept, such as `;`.

## Hard rules

- Single dependency-install step + single run command. Document both in the README.
- No real Microsoft Entra tenant IDs, client IDs, secrets, or PHI anywhere — including tests and comments. The one exception is the Partner Communications application ID `7c2215ec-e1fa-4aa6-9204-8ee91e63d29f`, which is public and part of the token scope.
- Do not invent fields, headers, status codes or `reason` values that aren't in `radiologists/partner-initiated/README.md`.
- Never send anything to a real Dragon Copilot endpoint, and don't add a base URL setting.
- Do not modify the C# Quickstart, the shared models, or the contract.
- Do not update `radiologists/src/samples/PartnerInitiated/README.md` or any other index README; the partner adds the row themselves.
- The repository-wide guidance in `.github/copilot-instructions.md` for extensions that Dragon Copilot calls doesn't apply to this client sample: no health check endpoints, `ProcessRequest`/`ProcessResponse` types, `.http` test files, CORS, Swagger, logging framework, or local validation of the payload or manifest. The console output described here is the sample's only output.

## After generating

1. Print a short summary: folder structure, key files, dependency-install command, run command.
2. Install dependencies for the new sample using the language's standard tooling.
3. Run the new sample's test suite.
4. Run the sample once with the default settings and confirm it prints `200 OK` and exits with `0`. If it prints `409` with reason `ResultAlreadyStored`, a stored-results file from an earlier run is still there: delete the file it printed and run again. Then delete the stored-results file, so the partner's first run also gets `200`.
5. If install, tests or the run fail, fix the generated code and re-run before reporting success.
6. List anything the partner should review before committing (library choices, anything the prompt was silent on).
