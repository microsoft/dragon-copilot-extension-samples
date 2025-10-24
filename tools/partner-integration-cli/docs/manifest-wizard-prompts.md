# Partner Manifest Wizard Prompt Reference

This document captures the console banners, guidance messages, and interactive questions that the Partner Integration CLI presents while running the manifest generation wizard. Use it to review or plan updates to the questionnaire without re-running the CLI.

## Partner Information (`promptPartnerDetails`)
- Console banner: `ℹ️  Partner Information`
- Context lines:
  - `Provide details for partner integration identification and configuration.`
  - `Integration name is dynamically rendered for customers (e.g., Contoso for Lamna Healthcare).`
  - `Partner ID should match the identifier from your app source (e.g., Microsoft Partner Center).`
- **Integration name:** default `partner-integration`
- Integration description automatically derived from the integration name.
- **Integration version:** default `0.0.1`
- **Partner ID:** default `00000000-0000-0000-0000-000000000000`

## Server Authentication (`promptServerAuthenticationEntries`)
- Console banner: `🔐 Server Authentication`
- Context line: `This section is for authenticating the partner server calling the DDE/Partner APIs.`
- Guide for using EntraId as an identity solution: `https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/partner-apis/entra-id`
- Repeats until the user declines to add another issuer (at least one required):
  - **Issuer authority URL:** default `https://login.microsoftonline.com/[TENANT_ID]/v2.0`
  - **Identity claim:** defaults to `oid` for first entry, `sub` afterwards
  - Nested loop (at least one required):
    - **Identity Value n:** default `00000000-0000-0000-0000-000000000000`
    - Confirm: `Add another identity value?` (default `no`)
  - Confirm: `Add another issuer for server authentication?` (default `no`)

## Note Generation (`promptNoteSections`)
- Console banner: `📋 Note Generation`
- Context line: `Select note sections to generate as well as mapping of sections.`
- Confirm: `Generate note sections?` (default `yes`)
  - If **No**: returns the "No Sections Mapped" note set (keys present with empty string values).
  - If **Yes**:
    - Confirm: `Generate all 11 standard note sections individually?` (default `yes`)
      - If **Yes**: returns standard note set.
      - If **No**: prompts to build custom mappings:
        - For each section:
          - Select: `Select note section {index}:` (remaining unused sections)
          - Confirm: `Map additional generated items for '{section}'?` (default `no`)
            - If **Yes**: repeat select prompts for additional items with confirm `Map another generated item?`
          - Confirm: `Add another note section?` (default `no`)

## Instance Configuration (`promptInstanceConfig`)
- Console banner: `📦 EHR Embedded Manfiest`
- Context lines:
  - `Adding an instance of the EHR embedded manifest to a DAC environment`
  - `Indicate items to be collected by the customer admin.`
- Subsection banner: `🔐 Client Authentication`
  - Confirm: `Allow multiple issuers for client authentication?` (default `yes`)
  - **Access token issuer default value (leave blank if none):** no default
  - Confirm: `Prompt client for User identity claim? (no defaults to 'sub')` (default `yes`)
    - If **Yes**:
      - **User identity claim default value (leave blank to use 'sub'):** default `sub`
      - Confirm: `Is the user identity claim required?` (default `no`)
  - Confirm: `Prompt client for customer identity claim? (no defaults to none)` (default `yes`)
    - If **Yes**:
      - **Customer identity claim default value (leave blank if none):** default `http://customerid.dragon.com`
      - Confirm: `Is the customer identity claim required?` (default `no`)

- Subsection banner: `📋 WebUI Launch Configuration`
  - Context line: `Partner enablement of SMART on FHIR AND/OR Token launch for web-based integrations.`
  - Select: `Select web launch enablement mode:` choices `SMART on FHIR`, `Token Launch`, `Both` (default `Both`)

### SMART on FHIR (`promptWebLaunchSof`, forced when mode includes SMART)
- Console banner: `⚙️  SMART on FHIR Configuration`
- **Web launch SMART on FHIR issuer name identifier:** default `access-token-issuer`
- **Web launch SMART on FHIR issuer description:** default `Issuer claim used when invoking the Dragon Copilot SMART on FHIR endpoint`
- **Web launch SMART on FHIR issuer default value (leave blank if none):** no default

### Token Launch (`promptWebLaunchToken`, forced when mode includes Token)
- Console banner: `⚙️  Token Launch Configuration`
- Confirm: `Reuse client authentication configuration?` (default `yes`)
  - If **Yes**: skips remaining token questions.
  - If **No**:
    - Confirm: `Allow multiple issuers for web launch tokens?` (default `no`)
    - Repeats issuer collection until user declines (at least one required):
      - **Web launch token issuer data type:** select (default `URL`)
        - If `Custom`, prompt `Web launch token issuer custom data type:` (default `string`)
      - **Web launch token issuer description:** default `Issuer claim value for partner-issued, user scoped access tokens during webUI launch`
      - Confirm: `Web launch token issuer required?` (default `yes`)
      - **Web launch token issuer default value (leave blank if none):** no default
      - **Web launch token issuer name identifier:** default `access-token-issuer`
      - Confirm: `Add another web launch issuer?` (default `no`)

### Context Retrieval (`promptContextRetrieval`)
- Console banner: `📋 Interop Contextual Requirements`
- Context line: `Partner determined context items to be collected by the customer admin from their environment.`
- Confirm: `Configure context retrieval items?` (default `yes`)
  - If **Yes**: iterate through available context keys until user stops:
    - Select: `Select context item {index}:`
    - **Description for '{key}':** default from definition
    - Confirm: `Is '{key}' required?` (default based on definition)
    - Confirm: `Add another context item?` (default `no`)

## Publisher Details (`promptPublisherDetails`)
Executed when the CLI is run with publisher generation enabled.
- **Publisher ID (e.g., contoso.healthcare):** no default
- **Publisher Name:** no default
- **Website URL:** no default
- **Privacy Policy URL:** no default
- **Support URL:** no default
- **Publisher Config Version:** default `0.0.1`
- **Contact Email:** no default
- **Offer ID:** default `${publisherId.split('.')[0]}-integration-suite`

## Wizard Assembly (`runPartnerManifestWizard`)
The CLI executes the sections above in order:
1. Partner Information
2. Server Authentication
3. Note Generation (optional custom mappings)
4. Instance Configuration
   - Client Authentication
   - SMART on FHIR (if enabled)
   - Token Launch (if enabled)
   - Context Retrieval (optional)
5. Publisher Details (only when requested)

Use this reference to edit prompt wording, adjust defaults, or coordinate documentation updates without stepping through the interactive flow.
