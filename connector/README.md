# Dragon Copilot Clinical Application Connectors

Welcome! This section contains documentation and information for building **Dragon Copilot Clinical Application Connectors**. Connectors integrate Dragon Copilot with EHRs, clinical applications, and enterprise APIs.

## Contents

- [Overview](#overview)
- [Getting started](#getting-started)
- [Connector CLI workflow](#connector-cli-workflow)
- [Generated manifest](#generated-manifest)
- [Validation and packaging](#validation-and-packaging)
- [Related resources](#related-resources)

## Overview

A Clinical Application Connector manifest describes:

- Partner and clinical application metadata
- Authentication of the partner server calling Dragon Copilot APIs
- Authentication values collected when a customer configures the connector
- SMART on FHIR and/or Token Launch support
- Optional context values collected for each connector instance

The Dragon Copilot CLI creates, validates, and packages connector manifests through the `dragon-copilot connector` command domain.

## Getting started

Follow the [Quickstart Guide](QUICKSTART.md) for a question-by-question walkthrough of the connector CLI wizard. It includes preparation guidance, defaults, validation requirements, conditional question paths, manifest field mappings, and troubleshooting.

For CLI installation and development instructions, see the [Dragon Copilot CLI README](../tools/dragon-copilot-cli/README.md).

## Connector CLI workflow

Run the full interactive wizard and write `extension.yaml` to a directory:

```powershell
dragon-copilot connector init --output ./my-connector
```

Create or update a specific manifest file interactively:

```powershell
dragon-copilot connector generate --interactive --output ./extension.yaml
```

Start from a built-in template:

```powershell
dragon-copilot connector generate --template ehr-integration --output ./extension.yaml
```

Available templates:

| Template | Intended starting point |
|----------|-------------------------|
| `ehr-integration` | EHR connector with SMART on FHIR and Token Launch examples |
| `api-connector` | Service-to-service API integration |
| `data-sync` | Inbound and outbound synchronization configuration |
| `custom` | Minimal connector to customize |

Template values are examples. Replace all sample names, GUIDs, URLs, claims, and context requirements before submission.

## Generated manifest

Connector manifests contain partner metadata, server authentication, and instance configuration. New manifests include the optional publisher display name by default:

```yaml
publisher-name: Sample Partner, Inc.
```

The obsolete `note-sections` block is not generated and is no longer accepted by connector validation. Remove it from older manifests before validating or uploading them to Dragon Admin Center.

The connector JSON Schema is maintained with the CLI at [`connector-manifest.json`](../tools/dragon-copilot-cli/src/schemas/connector-manifest.json).

## Validation and packaging

Validate a manifest against the connector schema and business rules:

```powershell
dragon-copilot connector validate ./extension.yaml
```

Package the manifest into a distributable ZIP:

```powershell
dragon-copilot connector package --manifest ./extension.yaml --output ./sample-partner.zip
```

Run the full validation command before packaging. The package command performs a smaller required-field check before creating the archive.

## Related resources

- [Connector CLI Quickstart](QUICKSTART.md)
- [Dragon Copilot CLI README](../tools/dragon-copilot-cli/README.md)
- [Shared platform documentation](../doc/)
- [Using Microsoft Entra ID for Partner APIs](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/partner-apis/entra-id)
- [SMART on FHIR App Launch](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/smart-fhir-app-launch)
- [Token Launch](https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/token-launch)
