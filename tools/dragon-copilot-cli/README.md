# Dragon Copilot CLI

The `dragon-copilot` CLI unifies the legacy extension and partner tooling into a single package. It now targets **manifest version 3** so you can author manifests that describe automation scripts, event triggers, and extension dependencies alongside the traditional tool definitions.

## Installation

From the CLI folder:

```powershell
npm install
npm run build
npm link
```

This exposes the `dragon-copilot` command globally for local development.

### Refresh an existing global install

If you already linked a previous version, relink to pick up the latest changes:

```powershell
npm unlink -g dragon-copilot
npm link
```

Run `npm unlink -g dragon-copilot` only once per workstation; subsequent rebuilds just need `npm run build && npm link`.

## Commands

| Domain     | Command Example                                       | Description |
|------------|--------------------------------------------------------|-------------|
| Extension  | `dragon-copilot extension init`                        | Interactive wizard that captures manifestVersion 3 data (automation scripts, event triggers, dependencies) and publisher configuration |
| Extension  | `dragon-copilot extension validate ./extension.yaml`   | Validates the manifest and optional `publisher.json` against JSON schema + business rules |
| Extension  | `dragon-copilot extension package --manifest ./extension.yaml` | Produces a zip payload ready for distribution |
| Partner    | `dragon-copilot partner init`                          | Restores the partner manifest wizard (note sections, context retrieval, authentication) |
| Partner    | `dragon-copilot partner validate ./integration.yaml`   | Validates partner manifests and publisher settings |

Use `dragon-copilot --help` or `dragon-copilot <domain> --help` for additional options.

During the partner wizard you will now confirm a **clinical application name**—typically the embedded EHR or workflow integration that issues user identities to Dragon Copilot—so the manifest captures that metadata consistently.

## HOWTO: Automation Script Scaffolding

When you run `dragon-copilot extension init`, the wizard now includes an **automation script** section.

1. **Enable Scripts** – choose "yes" when prompted to add automation scripts. The CLI will keep asking until you decline.
2. **Script Details** – provide:
   - Script name (lowercase with hyphens)
   - Optional description
   - Entry point (relative path, e.g. `scripts/note/index.js`)
   - Runtime (Node.js 18, Python 3.11, .NET 8)
   - Optional timeout in seconds
3. **Event Triggers** – if scripts exist, the wizard asks whether to wire triggers:
   - Trigger name, description, event type (e.g. `note.created`)
   - Optional conditions (string expressions)
   - Script selection (from scripts defined in step 2)
4. **Dependencies** – declare external services, extensions, or packages:
   - Name and semantic version (minimum compatible version)
   - Optional type (`service`, `extension`, `package`)

The generated `extension.yaml` will include:

```yaml
manifestVersion: 3
automationScripts:
  - name: example-script
    entryPoint: scripts/example/index.js
    runtime: nodejs18
    timeoutSeconds: 120
eventTriggers:
  - name: note-created
    eventType: note.created
    scriptName: example-script
dependencies:
  - name: terminology-service
    version: 1.0.0
    type: service
```

You can update scripts later via `dragon-copilot extension generate --interactive`, which reuses the same prompts while preserving existing values.

## Development Notes

- Shared helpers now live under `src/common`, keeping the CLI self-contained without external workspaces.
- `npm run build` emits compiled JS plus copies schemas/resources into `dist/`.
- `npm test` covers extension + partner flows (command registration, schema validation, CLI integration).

## Troubleshooting

- **CLI Not Found**: Ensure `npm link` completes without error and your Node install adds the npm global bin directory to PATH.
- **Process Exit during Tests**: Tests set `process.exitCode` and mock logging. If you add new commands, ensure they don’t call `process.exit()` directly in unit scenarios.
- **Schema Errors**: Check the `src/schemas/*.json` files for the latest manifest requirements.
