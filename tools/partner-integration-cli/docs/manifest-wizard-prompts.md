# Partner Manifest Wizard Prompt Reference

This document captures the console banners, guidance messages, and interactive questions surfaced by the Partner Integration CLI during the manifest wizard. Use it to review the experience or plan copy updates without re-running the CLI.

## Partner Details (`promptIntegrationDetails`)

- Console banner: `🤝 Partner Details`
- Guidance:
  - `Partner ID should match the identifier from your app source (e.g. source, Microsoft Partner Center).`
- Prompts:
  - **Integration name:** default `partner-integration`
  - Integration description automatically derived from the integration name.
  - **Integration version:** default `0.0.1`
  - `Do you already have a Partner ID from NMC or Partner Center?` (default `yes` when an ID is detected)
  - **Partner ID (App Source Id):** no default; validated as lowercase slug. Choosing `no` to the previous question generates a GUID automatically and surfaces it in the review step.

## Server Authentication (`gatherServerAuthenticationEntries`)

- Console banner: `🔐 Server Authentication`
- Guidance:
  - `Common Entra ID claims include Enterprise Application Object ID (oid) or Application (Client) ID (azp) values.`
  - Reference: <https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/assign-roles-azure-service-principals#find-your-service-principal-and-tenant-ids>
- Loop prompts:
  1. **Server authentication issuer {n}:** no default; requires valid URL
  2. **Identity claim {n}:** default `azp`
  3. **Allowed identity values {n} (comma separated):** no default; must include at least one value
- After each issuer the CLI asks: `Add another server authentication issuer?` (default `no`). At least one issuer is required.

## Note Generation (`gatherNoteSections`)

- Console banner: `📋 Note Generation`
- Helper text: `Each note section can be generated individually or mapped to another section.`
- Flow:
  1. `Generate <section>?` (default `true`). Selecting `false` omits the section completely.
  2. When configuring `assessment`, the wizard asks `Map plan to assessment?` (default `true`). When selected, `plan` automatically maps to `assessment` and is skipped later.
  3. For remaining eligible sections the CLI uses a single multi-select prompt:
     - `Select sections to map to <section> (press Space to toggle, Enter to continue):`
     - Multiple destinations can be selected in one prompt; the old "add another mapping" loop has been removed.
- Sections that have already been mapped are not prompted again.

## Instance Configuration (`gatherClientAuthAndWeb`)

### Client Authentication

- Banner: `Client Authentication`
- Prompts:
  1. `Allow multiple issuers for client authentication?` (default `yes`).
  2. `Default client authentication access token issuer URL (leave blank for none):` (no default).
  3. `Collect user identity claim?` (default `true`).
     - If `yes`:
       - `User identity claim name:` default `sub`.
       - `Is the user identity claim required?` (default `no`).
  4. `Collect customer identity claim?` (default `false`).
     - If `yes`:
       - `Customer identity claim name:` default `http://customerid.dragon.com`.
       - `Is the customer identity claim required?` (default `no`).

### Web Launch

- Banner: `🌐 Web Launch`
- Helper text links out to SMART on FHIR and Token Launch documentation.
- Flow:
  1. `Configure SMART on FHIR web launch issuer?` (default `false`).
     - If `yes`, prompt `Default SMART on FHIR issuer URL (leave blank for none):` (no default).
  2. Token Launch configuration is required when SMART on FHIR is disabled. Otherwise the CLI asks `Configure Token Launch?` (default `true`).
     - `Use client authentication for web launch tokens?` (default `yes`).
     - `Allow multiple issuers for web launch tokens?` (default `no`).
     - If not reusing client authentication, the wizard invokes `gatherNamedIssuerFields` to capture issuer name, data type (`url` default with `custom` option), description, required flag, and optional default value. Multiple issuers can be added sequentially.

### Context Retrieval

- Banner: `🧠 Context Retrieval`
- Guidance reminds that Interop environment metadata can be included automatically.
- Prompts:
  1. `Include Interop context values?` (default `true`). Selecting `false` returns `null` and skips the remainder.
  2. For each catalog entry:
     - `Include <context-key>?` (defaults follow the catalog; `ehr-user_id` now defaults to `true`).
     - If included, `Is <context-key> required?` (default from catalog).

## Publisher Details (`promptPublisherDetails`)

- Only shown when the wizard is run with publisher generation enabled.
- Prompts mirror `@dragon-copilot/cli-common` and validate URLs, emails, and semantic versions:
  - Publisher ID / Name / Website URL / Privacy Policy URL / Support URL / Contact Email
  - `Publisher config version:` default `0.0.1`
  - `Offer ID:` default `${publisherId.split('.')[0]}-integration-suite`

## Wizard Assembly (`runPartnerManifestWizard`)

The CLI executes the sections above in order:
1. Partner details
2. Server authentication issuers
3. Note generation and mappings
4. Instance configuration
   - Client authentication
   - SMART on FHIR (optional)
   - Token Launch (required when SMART on FHIR is disabled)
   - Context retrieval (optional)
5. Publisher details (only when requested)

Use this reference to keep prompt wording, defaults, and documentation aligned with the current CLI experience.
