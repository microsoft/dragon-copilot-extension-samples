# Clinical Application Connector CLI Quickstart

This guide walks partners through the questions asked by the `dragon-copilot` CLI when creating a Dragon Copilot Clinical Application Connector. It documents the current questions, defaults, validation rules, and conditional paths so you can prepare answers before running the wizard.

## Before you begin

Install or build the CLI by following the [CLI README](../tools/dragon-copilot-cli/README.md). Verify that it is available:

```powershell
dragon-copilot --version
dragon-copilot connector --help
```

Gather these details before starting the wizard:

- Integration name and semantic version
- Human-readable publisher name
- Partner ID from NMC or Partner Center, if one has been assigned
- Clinical application name
- Server authentication issuer URL, identity claim, and allowed identity GUIDs
- Customer-facing client authentication requirements
- Supported launch methods: SMART on FHIR, Token Launch, or both
- Context values the customer must provide when configuring an instance

## Choose a workflow

### Run the complete wizard

`init` writes `extension.yaml` to the selected output directory:

```powershell
dragon-copilot connector init --output ./my-connector
```

Supported options:

| Option | Purpose | Default |
|--------|---------|---------|
| `--name <name>` | Supplies the initial integration name. | Prompted |
| `--description <description>` | Accepted by the command but currently ignored. The wizard always derives the description from the integration name. | Derived |
| `--version <version>` | Supplies the initial semantic version. | `0.0.1` |
| `--output <path>` | Directory where `extension.yaml` is written. | Current directory |

### Create or update interactively

`generate --interactive` writes to a manifest file. When that file exists, the CLI uses its integration name, version, publisher name, Partner ID, and clinical application name as defaults.

```powershell
dragon-copilot connector generate --interactive --output ./extension.yaml
```

### Start from a template

Template generation is non-interactive:

```powershell
dragon-copilot connector generate --template ehr-integration --output ./extension.yaml
```

Available templates:

| Template | Intended starting point |
|----------|-------------------------|
| `ehr-integration` | EHR connector with SMART on FHIR and Token Launch examples. |
| `api-connector` | Service-to-service API integration. |
| `data-sync` | Inbound and outbound synchronization configuration. |
| `custom` | Minimal connector to customize. |

Template values are examples. Replace all sample names, GUIDs, URLs, claims, and context requirements before submission.

## How review questions work

After each major section, the CLI prints a summary and asks whether to keep the answers. **Yes** accepts the section. **No** repeats the entire section.

The review questions are:

- `Keep these integration details?`
- `Keep these server authentication?`
- `Keep these web launch configuration?`
- `Keep these context retrieval configuration?`

All review questions default to **Yes**.

## Question 1: Integration details

### `Integration name:`

A required name between 3 and 50 characters.

- Must start and end with a letter or number.
- May contain letters, numbers, spaces, hyphens, and underscores.
- The CLI normalizes the name to lowercase kebab case.
- Spaces and underscores become hyphens.
- Unsupported characters are removed and repeated hyphens are collapsed.

Example: `Sample Partner EHR` becomes `sample-partner-ehr`.

### `Integration version:`

The connector manifest version.

- Default: `0.0.1`
- Required format: `x.y.z`, for example `1.2.0`

### `Publisher display name:`

The human-readable organization or publisher name shown for the connector.

- Default: `Sample Partner, Inc.`
- The wizard requires a non-empty value.

### `Do you already have a Partner ID from NMC or Partner Center?`

Determines whether the CLI uses an existing Partner ID or generates one for you.

- Default for a new manifest: **No**
- **Yes**: the CLI asks for the existing Partner ID.
- **No**: the CLI generates a lowercase GUID and displays it for review.

### `Partner ID (App Source Id):`

Asked only when an existing Partner ID is available.

- Must be a GUID.
- Example: `12345678-1234-1234-1234-123456789abc`

### Derived integration description

The description is not a separate interactive question. The CLI derives it from the entered integration name, converts the name to uppercase words, adds `INTEGRATION` when needed, and appends the Dragon Copilot description suffix. For example, `Sample Partner EHR` produces `SAMPLE PARTNER EHR INTEGRATION for Dragon Copilot healthcare data processing.` in the review.

### `Clinical application name:`

The application integrated with Dragon Copilot, typically the embedded EHR or workflow application that supplies user identity context.

- Default: `Sample Partner Clinical Application`
- Must be non-empty.

### `Keep these integration details?`

Review the normalized name, generated description, version, publisher, Partner ID, and clinical application name.

- Default: **Yes**
- **No** repeats all integration detail questions.

## Question 2: Server authentication

This section configures how Dragon Copilot validates the partner server calling the DDE/Partner API. At least one issuer entry is required.

See [Using Microsoft Entra ID for Partner APIs](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/partner-apis/entra-id).

The following questions repeat for each server authentication issuer.

### `Server authentication issuer 1:`

The issuer URL for tokens used by the partner server.

- Must be a valid URL.

### `Identity claim 1:`

The token claim used to identify the calling application or service principal.

- Default: `azp`
- Must contain exactly three letters.
- Common Entra ID examples are `azp` and `oid`.

### `Allowed identity values 1 (comma separated):`

The accepted values for the selected identity claim.

- At least one value is required.
- Separate multiple values with commas.
- Connector validation requires each value to be a GUID.
- The CLI trims spaces around each value.

Example input:

```text
aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

### `Add another server authentication issuer?`

- Default: **No**
- **Yes** repeats the issuer, claim, and allowed-value questions with the next index.

### `Keep these server authentication?`

The review shows every issuer, identity claim, and allowed value.

- Default: **Yes**
- **No** discards all entries and restarts this section.

## Question 3: Instance configuration

The wizard collects client authentication and web launch answers as one instance-configuration section. The final `Keep these web launch configuration?` review accepts or repeats both sets of questions together.

**Client authentication**
 # How partner-issued, user-scoped access tokens are validated.
Client authentication describes values collected when a customer adds an instance of the connector in Dragon Admin Center. This is separate from server authentication.


### `Allow multiple issuers for client authentication?`

Whether a configured connector instance may use multiple access-token issuers.

- Default: **No**

### `Default client authentication access token issuer URL (leave blank for none):`

An optional default issuer shown during customer configuration.

- Default: blank
- When supplied, it must be a valid URL.
- Customers will be required to provide an issuer when no default is supplied.

### `Collect user identity claim?`

Whether Dragon Admin Center should collect the claim name that identifies the end user in the clinical application.

- Default: **No**
- When omitted, the runtime behavior defaults to `sub`.

When **Yes**, the CLI asks:

#### `Default user identity claim name:`

- Default: `sub`
- Must be non-empty.

#### `Is the user identity claim required?`

- Default: **No**
- Determines whether the customer must provide this value during connector configuration.

### `Collect customer identity claim?`

Whether Dragon Admin Center should collect the claim name containing the Microsoft environment identifier.

- Default: **No**

When **Yes**, the CLI asks:

#### `Default customer identity claim name:`

- Default: `http://customerid.dragon.com`
- Must be non-empty.

#### `Is the customer identity claim required?`

- Default: **No**
- Determines whether the customer must provide this value during connector configuration.

**Web launch**

A connector must support SMART on FHIR, Token Launch, or both.

References:

- [SMART on FHIR App Launch](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/smart-fhir-app-launch)
- [Token Launch](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/token-launch)

### `Configure SMART on FHIR web launch issuer?`

- Default: **No**
- **Yes** asks for an optional default issuer.
- **No** makes Token Launch mandatory.

When **Yes**, the CLI asks:

#### `Default SMART on FHIR issuer URL (leave blank for none):`

- Default: blank
- When supplied, it must be a valid URL.

### `Configure Token Launch?`

This question appears only when SMART on FHIR is enabled.

- Default: **Yes**
- When SMART on FHIR is not enabled, Token Launch is added automatically and this question is skipped.

When Token Launch is enabled, the CLI asks the following questions.

### `Use client authentication for web launch tokens?`

Whether Token Launch should reuse the client authentication issuer settings.

- Default: **Yes**

### `Allow multiple issuers for web launch tokens?`

- Default: **No**

The remaining questions depend on the previous answers.

### Branch A: Reuse client authentication

When `Use client authentication for web launch tokens?` is **Yes** and multiple issuers is **No**, no additional issuer fields are collected.

When reuse is **Yes** and multiple issuers is **Yes**, the CLI collects one or more named issuer fields:

#### `Web launch issuer field 1 name:`

- First-field default: `access-token-issuer`
- Must be non-empty.

#### `Web launch issuer field 1 type:`

- Choices: `URL` or `String`
- Default: `URL`

#### `Web launch issuer field 1 description:`

- First-field default: `Issuer claim for partner-issued web launch tokens.`
- Must be non-empty.

#### `Is this field required?`

- First-field default: **Yes**
- Additional-field default: **No**

#### `Default value for access-token-issuer (optional):`

- Default: blank
- URL fields require a valid URL when populated.

#### `Add another web launch issuer field?`

- Default: **No**
- **Yes** repeats the named field questions.

### Branch B: Separate Token Launch authentication

When `Use client authentication for web launch tokens?` is **No**, the CLI asks:

#### `Default access token issuer for web launch tokens (leave blank for none):`

- Default: blank
- When supplied, it must be a valid URL.
- Customers will be required to provide an access-token issuer when no default is supplied.

#### `Collect user identity claim for web launch tokens?`

- Default: **No**

When **Yes**, the CLI asks:

##### `Default user identity claim value (optional):`

- Default: `sub`

##### `Is the web launch user identity claim required?`

- Default: **No**

### `Keep these web launch configuration?`

The review includes client authentication, SMART on FHIR, Token Launch, and issuer-field settings.

- Default: **Yes**
- **No** restarts both client authentication and web launch questions.

## Question 4: Context retrieval

Context retrieval defines values a customer can supply for a connector instance. Environment name, environment ID, EHR type, product name, and Partner ID are collected automatically outside this list.

### `Include Interop context values?`

- Default: **No**
- **No** skips the remaining context questions.
- **Yes** asks whether to include each catalog item.

For every catalog item, the CLI asks:

1. `Include <context-item>?`
2. `Is <context-item> required?` when it is included

All catalog items default to included. Required defaults are listed below.

| Context item | Type | Required default | Repository description |
|--------------|------|------------------|------------------------|
| `base-url` | URL | Yes | Base URL needed for API calls, typically FHIR calls. |
| `ehr-user-id` | String | No | Optional EHR user ID for FHIR API calls. |
| `in-bound-client-id` | String | Yes | Credential for inbound calls to Interop. |
| `in-bound-issuer` | URL | Yes | Issuer claim of access tokens used by the partner to call Dragon Copilot Interop. |
| `out-bound-issuer` | URL | Yes | Endpoint used to issue an access token for Dragon Copilot Interop to call the partner. |
| `out-bound-client-id` | String | Yes | Partner-provided client ID used to issue access tokens for Dragon Copilot Interop to call the partner. |
| `out-bound-secret` | String | Yes | Partner-provided secret used to issue access tokens for Dragon Copilot Interop to call the partner. |

The names, types, and descriptions are fixed. The partner controls inclusion and whether each included item is required. Context items do not support default values.

### `Keep these context retrieval configuration?`

The review shows whether context retrieval is configured, how many items are included, and their keys.

- Default: **Yes**
- **No** restarts the context retrieval section.

## Validate the manifest

Run validation before packaging:

```powershell
dragon-copilot connector validate ./extension.yaml
```

If no path is supplied, the CLI lets you:

- Validate `extension.yaml` in the current directory
- Enter another path
- Cancel validation

Validation checks:

- Required connector information
- Integration name and semantic version formats
- Partner and identity GUIDs
- Issuer URLs
- Three-letter server identity claims
- At least one server authentication entry
- SMART on FHIR and/or Token Launch configuration
- Client and web launch configuration
- Supported context values and duplicate selections

Validation rejects the obsolete `note-sections` property. Remove it from older connector files before uploading to Dragon Admin Center.

## Package the connector

Create the distributable ZIP:

```powershell
dragon-copilot connector package --manifest ./extension.yaml --output ./sample-partner.zip
```

Packaging options:

| Option | Purpose | Default |
|--------|---------|---------|
| `--manifest <path>` | Connector manifest to package. | `extension.yaml` |
| `--output <path>` | Output ZIP path. | `<name>-<version>.zip` |
| `--include <paths...>` | Additional files or directories to include. | None |
| `--silent` | Suppresses package command output. | Off |

The archive always stores the manifest as `extension.yaml`. A `locales` directory in the current directory is included automatically.

Run the full `validate` command before packaging. The package command performs a smaller required-field check before creating the archive.

## Troubleshooting

### The CLI says a URL is invalid

Use a complete absolute URL, including the scheme, such as `https://login.example.com/oauth2/default`.

### The CLI says a GUID is invalid

Use the standard five-part GUID format:

```text
12345678-1234-1234-1234-123456789abc
```

### Validation rejects `note-sections`

Remove the entire `note-sections` block. Dragon Admin Center no longer requires it for connector upload.

### Validation requires a launch configuration

Enable SMART on FHIR, Token Launch, or both. If SMART on FHIR is not selected in the wizard, Token Launch is configured automatically.

### I need to change earlier answers

Answer **No** at the section review question to repeat that section. After generation, rerun `generate --interactive` against the same output file to reuse its metadata as defaults.

## References

- [Connector documentation](README.md)
- [Dragon Copilot CLI README](../tools/dragon-copilot-cli/README.md)
- [Using Microsoft Entra ID for Partner APIs](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/partner-apis/entra-id)
- [SMART on FHIR App Launch](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/smart-fhir-app-launch)
- [Token Launch](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/token-launch)
