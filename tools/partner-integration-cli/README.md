# Partner Integration CLI

A cross-platform CLI tool for Partner Integration development, including manifest generation, publisher configuration, validation, and packaging.

## Features

- **Interactive Manifest Generation**: Guided wizard to define tokens, authentication, note sections, and runtime settings
- **Template-based Generation**: Pre-built partner manifest templates for common scenarios
- **Publisher Configuration**: Generate and manage marketplace metadata (`publisher.json`)
- **Manifest Validation**: Detailed checks with actionable guidance
- **Integration Packaging**: Produce deployment-ready ZIP bundles
- **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

### From GitHub Releases

> Note: Not currently available

### From npm

> Note: Not currently available

### From Source

```bash
git clone <repository-url>
cd tools/partner-integration-cli
npm install
npm run build
npm link
```

## Usage

### Initialize a New Integration

```bash
partner-integration init
```

Runs the manifest wizard, optionally creates `publisher.json`, and scaffolds an assets directory.

### Generate from Template

```bash
partner-integration generate --template ehr-integration
partner-integration generate --template api-connector
partner-integration generate --template data-sync
partner-integration generate --template custom
```

Creates `integration.yaml` using curated templates.

### Regenerate Manifest Interactively

```bash
partner-integration generate --interactive
```

Rebuilds the manifest with the wizard and offers to create or refresh `publisher.json`.

### Validate a Manifest

```bash
partner-integration validate integration.yaml
```

Validates the manifest and `publisher.json` (if present) with detailed feedback.

### Package Integration

```bash
partner-integration package
partner-integration package --include schemas/
partner-integration package --output my-integration-v1.0.0.zip
```

Produces a deployment-ready ZIP containing the manifest, publisher metadata, and assets.

### Validate and Package Together

Use the helper script to run validation followed by packaging from a single command:

```bash
npm run validate-and-package -- --cwd ../my-integration-folder
```

Run this from the `tools/partner-integration-cli` directory, pointing `--cwd` at the folder containing `integration.yaml` and `publisher.json`.

## File Structure

```
my-integration/
├── integration.yaml    # Partner manifest
├── publisher.json      # Marketplace configuration
└── assets/
    └── logo_large.png  # Required large logo (PNG)
```

### Single Page Manifest Builder

The `web/` directory contains a standalone HTML application (`index.html`) that mirrors the CLI wizard. Launching the page lets you:

- Walk through each prompt in a browser and capture the same inputs as the CLI.
- Generate `integration.yaml` and (optionally) `publisher.json` client-side.
- Download the outputs and feed them into `partner-integration validate` or `partner-integration package` for verification and bundling.

This is helpful for demonstrations or partner teams that prefer a graphical workflow while still producing CLI-compatible artifacts.

## Manifest Format

Partner Integration manifests capture partner identity, token handling, authorization, and runtime configuration:

```yaml
#### PARTNER PROVIDED #####

name: sample-partner ##REQUIRED This will be dynamically rendered (i.e. "RedRover for Meditech)
description: Dragon Copilot deep integration for sample-partner ##REQUIRED 
version: 0.0.1 ##REQUIRED 
partner-id: as defined by app source ##REQUIRED 

## FYI Removed Product field, as 1EHR/env, but multiple products. 

# This section is for authenticaing the partner server calling DDE/Partner API
server-authentication:
  - issuer: https://someissuer1.comp ##REQUIRED 
    identity_claim: azp ##REQUIRED 
    identity_value:
      - Guid1 ##REQUIRED 
      - Guid2 ##OPTIONAL
  - issuer: https://someissuer2.comp ##OPTIONAL
    identity_claim: azp ##OPTIONAL
    identity_value: ##OPTIONAL
      - Guid3 ##OPTIONAL
      - Guid4 ##OPTIONAL

# Defines which of the 11 note sections this partner would like generated as well as
# any mapping of section.  The key is the section, the value is which items the partner
# would like in the section.  No items means the partner does not want the section
# generated.
# This will change if the Dragon Ontology Knownledge base comes to fruition. 
note-sections: ## OPTIONAL, CAN BE A LIST
  hpi: 
    - hpi
    - chief-complaint
  chief-complaint:
  past-medical-history:
  assessment: 
    - assessment
    - plan
  medications:
  allergies:
  review-of-systems:
  physical-exam: physical-exam
  procedures: procedures
  results: results

# This section is for adding an instance of the EHR embedded manifest to an environment. The partner will
# indicate which items need to collected from a predefined list.  Data items that need to be collected are
# expressed as objects consisting of a name, data type, description, default value, and a flag indicating
# if customer admin must provide value.  If a partner does not require an item to be collect they will
# omit the item from their manifest. 
instance: 
  client-authentication: ##REQUIRED  # describes how partner issued, user scoped access tokens are validated.
    allow-multiple-issuers: yes ## Optional 
    issuer: # Information to collect for each access token issuer. ##REQUIRED
      # For most partners, the value will be different for every customer.  There may be some
      # partners (Athena)  that use the same issuer for all customers.  We need a way for the 
      # partner to set that value and indicate that DAC should not collect the valaue.
      access-token-issuer: ## REQUIRED DAC will always prompt for this value.
        type: url ##REQUIRED Microsoft defines the type for this field.  
        description: The value of the issuer claim for partner issued, user scoped access tokens.##REQUIRED 
        default-value: ##Optional
        required: yes ##REQUIRED Microsoft requires this field to be populated.
      # For the user-identity-claim and the customer-identity-claim, we need a way for the partner to
      # indicate they are using partner specific values that will be the same for all customers. i.e. DAC
      # should not prompt for these.
      user-identity-claim: ##Optional  DAC will only prompt for this value if the partner includes it in the manifest.
                           #           If it's not included in the manifest, it will default to 'sub'.
        type: string ##Optional  Microsoft defines the type.  user-identity-claim is a string.
        description: Optional name of claim containing the EHR identity of an end user.  Defaults to 'sub' if not collected. ##Optional
        default-value: sub  ##Optional  Partner can provide a default value.
        required: no ##Optional
      customer-identity-claim: ## Optional
        type: string
        description: Optional name of claim containing the Microsoft environment ID.
        default-value: http://customerid.dragon.com
        required: no ## Optional


 ### CUSTOMER ADMIN PROVIDES TO PARTNER -- EITHER SOF OR WEB-LAUNCH IS REQUIRED. #####       
  
  web-launch-sof: ##Optional-- If partner uses web app w/ SOF, then required
    name: access-token-issuer ##Optional
    type: url ##Optional
    description: The value of the issued claim when invoking the Dragon Copilot SMART on FHIR endpoint. ##Optional
    default-value:  ##Optional
    required: yes ##Optional

  web-launch-token:
    use-client-authentication: yes # Use the same value that was configured for client-authentication.  If
                                   # this is set to yes, nothing else is required.
    allow-multiple-issuers: yes ##Optional
    issuer: # Information to collect for each access token issuer. ##Optional
      - name: access-token-issuer ##Optional
        type: url ##Optional
        description: The value of the issuer claim for partner issued, user scoped access tokens. ##Optional
        default-value: ##Optional
        required: yes ##Optional
      - name: user-identity-claim ##Optional
        type: string ##Optional
        description: Optional name of claim containing the EHR identity of an end user.  Defaults to 'sub' if not collected. ##Optional
        default-value: sub  ##Optional
        required: no ##Optional


   ###  PARTNER DETERMINES WHAT NEEDS TO BE COLLECTED, BUT FROM CUSTOMER ADMIN #####    

  context-retrieval:##Optional
    # Interop needs the following items.  These will not be collected because they are part of the environment:
    #   environment name, environment id, EHR type, product name, partner id
    # These are the items that may be collected.  The partner includes the items that the partner requires.
    instance: ##Optional
      - name: base_url  ##Optional
        type: url ##Optional
        description: base url need for API calls.  These are typically FHIR calls. ##Optional
        required: yes ##Optional  ## PRASHANT COMMENT: "needs clarity if this is the same as the base url for the fhir server that we configure as part of the smart on fhir setup"
      - name: ehr-user_id ##Optional
        type: string ##Optional
        description: optional EHR user id for FHIR API calls. ##Optional
        required: no ##Optional
      - name: in-bound-client-id ##Optional
        type: string ##Optional
        description: credential for inbound calls to interop ##Optional
        required: yes ##Optional
      - name: in-bound-issuer ##Optional
        type: url ##Optional
        description: issue claim of access tokens used to partner to call Dragon Copilot Interop
        required: yes ##Optional
      - name: out-bound-issuer ##Optional
        type: url ##Optional
        description: endpoint used to issue access token for Dragon Copilot Interop to call partner
        required: yes ##Optional
      - name: out-bound-client-id ##Optional
        type: string ##Optional
        description: partner provided client id to issued access tokens for Dragon Copilot Interop to call partner
        required: yes ##Optional
      - name: out-bound-secret ##Optional
        type: string ##Optional
        description: partner provided secret to issued access tokens for Dragon Copilot Interop to call partner
        required: yes ##Optional
      # The workflow can be inferred from the presense of in-bound/out-bound config. 
      #- name: workflow
      #  description: the workflow supported by this integration
      #  type: multiselect (inbound/outbound)
```

### Manifest Sections

- **tokenSpecifications**: Define partner/customer token issuers and claim mappings used during authentication.
- **serverAuthentication**: Enumerate token references and subject identifiers authorized to call the integration.
- **noteSections**: Control which documentation sections Dragon Copilot should generate or suppress.
- **instance**: Specify runtime behaviors such as client authentication defaults, SMART on FHIR launch settings, and contextual values required by the partner service.

## Publisher Configuration Format

The `publisher.json` file contains publisher information required for integration distribution:

```json
{
  "publisherId": "contoso.healthcare",
  "publisherName": "Contoso Healthcare Inc.",
  "websiteUrl": "https://www.contosohealth.com",
  "privacyPolicyUrl": "https://www.contosohealth.com/privacy",
  "supportUrl": "https://www.contosohealth.com/support",
  "version": "0.0.1",
  "contactEmail": "support@contosohealth.com",
  "offerId": "contoso-integration-suite",
  "defaultLocale": "en-US",
  "supportedLocales": ["en-US"],
  "scope": "US",
  "regions": ["US"]
}
```

### Publisher Configuration Fields

- **publisherId**: Unique identifier for the publisher (e.g., `contoso.healthcare`)
- **publisherName**: Display name of the publisher
- **websiteUrl**: Publisher's website URL
- **privacyPolicyUrl**: URL to privacy policy
- **supportUrl**: URL for support information
- **version**: Version of the publisher configuration
- **contactEmail**: Contact email for support
- **offerId**: Identifier for the integration offering
- **defaultLocale**: Must be `en-US` (current supported locale)
- **supportedLocales**: Must be `["en-US"]`
- **scope**: Must be `US`
- **regions**: Must be `["US"]`

## Templates

### ehr-integration
Sample manifest for Electronic Health Record partners that need SMART on FHIR launch configuration and multiple authorized subject groups.

### api-connector
Focused on service-to-service API integrations with streamlined client authentication and context expectations.

### data-sync
Demonstrates multi-token scenarios, facility-scoped context, and flexible web-launch defaults for synchronization platforms.

### custom
Minimal manifest starter intended for bespoke partner integrations.

## Development

```bash
npm install
npm run dev
npm run build
npm test
npm run package
```

## Contributing

This tool follows the same contribution pattern as the Dragon Extension CLI:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## GitHub Actions Integration

> Note: Future-looking example for automated releases.

```yaml
name: Release Partner Integration CLI
on:
  push:
    tags: ['partner-v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tools/partner-integration-cli && npm ci
      - run: cd tools/partner-integration-cli && npm run package
      - uses: softprops/action-gh-release@v1
        with:
          files: tools/partner-integration-cli/releases/*
```

<!-- END README -->