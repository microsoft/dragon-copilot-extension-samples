# Dragon Copilot CLI

The `dragon-copilot` CLI unifies the legacy extension and Clinical Application Connector tooling into a single package. It now targets **manifest version 3** so you can author manifests that describe automation scripts, event triggers, and extension dependencies alongside the traditional tool definitions.

## Installation

From the CLI folder:

```powershell
cd tools/dragon-copilot-cli
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
| Connector  | `dragon-copilot connector init`                          | Clinical Application Connector manifest wizard (note sections, context retrieval, authentication) |
| Connector  | `dragon-copilot connector validate ./extension.yaml`   | Validates Clinical Application Connector manifests and publisher settings |

Use `dragon-copilot --help` or `dragon-copilot <domain> --help` for additional options.

During the connector wizard you will now confirm a **clinical application name**—typically the embedded EHR or workflow integration that issues user identities to Dragon Copilot—so the manifest captures that metadata consistently.

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
- `npm test` covers extension + connector flows (command registration, schema validation, CLI integration).

## Building Standalone Executables

The CLI can be packaged as a standalone executable using Node.js Single Executable Applications (SEA). This allows distribution without requiring Node.js to be installed on the target machine.

### Prerequisites

- Node.js 20.x or later (SEA support required)
- Windows, macOS, or Linux

### Build Commands

```powershell
# Build for current platform
npm run build:sea
```

This creates a standalone executable at `dist/bin/dragon-copilot.exe` (Windows) or `dist/bin/dragon-copilot` (macOS/Linux).

### How It Works

The build process:
1. **Bundles** TypeScript/ESM to a single CommonJS file using esbuild
2. **Embeds** schemas and resources directly into the bundle
3. **Generates** a SEA preparation blob using Node.js
4. **Injects** the blob into a copy of the Node.js binary using postject

### Output Size

The executable is approximately 85-90 MB as it includes the full Node.js runtime.

### Distribution

The generated executable is self-contained and can be distributed directly:

```powershell
# Copy to a system location
Copy-Item .\dist\bin\dragon-copilot.exe C:\tools\

# Run from anywhere
dragon-copilot --help
```

## Troubleshooting

- **CLI Not Found**: Ensure `npm link` completes without error and your Node install adds the npm global bin directory to PATH.
- **Process Exit during Tests**: Tests set `process.exitCode` and mock logging. If you add new commands, ensure they don't call `process.exit()` directly in unit scenarios.
- **Schema Errors**: Check the `src/schemas/*.json` files for the latest manifest requirements.
- **SEA Build Fails**: Ensure you're using Node.js 20.x or later. Check that `postject` is installed correctly.
