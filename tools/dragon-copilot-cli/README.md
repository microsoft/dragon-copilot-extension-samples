# Dragon Copilot CLI

The `dragon-copilot` CLI allows you to generate, validate, and package manifests for Dragon Copilot Physician Workflows and Clinical Application Connectors.

## Installation

### Option 1: Download standalone binary (Recommended)

Download the latest release for your platform from the [Releases page](../../releases). The binary is a self-contained executable—no Node.js installation required.

After downloading, place the binary on your system PATH and run:

```bash
dragon-copilot --help
```

### Option 2: Build from source

For contributors or local development, build from the repository:

```powershell
cd tools/dragon-copilot-cli
npm install
npm run build
npm link
```

This exposes the `dragon-copilot` command globally for local development.

#### Refresh an existing global install

If you already linked a previous version, relink to pick up the latest changes:

```powershell
npm unlink -g dragon-copilot
npm link
```

Run `npm unlink -g dragon-copilot` only once per workstation; subsequent rebuilds just need `npm run build && npm link`.

## Commands

| Domain     | Command Example                                       | Description |
|------------|--------------------------------------------------------|-------------|
| Physician  | `dragon-copilot physician init`                        | Interactive wizard that generates an extension manifest |
| Physician  | `dragon-copilot physician validate ./extension.yaml`   | Validates the manifest against JSON schema + business rules |
| Physician  | `dragon-copilot physician package`                     | Produces a zip containing the manifest and any included files |
| Connector  | `dragon-copilot connector init`                          | Clinical Application Connector manifest wizard (note sections, context retrieval, authentication) |
| Connector  | `dragon-copilot connector validate ./extension.yaml`   | Validates Clinical Application Connector manifests |
| Connector  | `dragon-copilot connector package`                     | Produces a zip containing the manifest and any included files |

Use `dragon-copilot --help` or `dragon-copilot <domain> --help` for additional options.

During the connector wizard you will be asked to confirm a **clinical application name**—typically the embedded EHR or workflow integration that issues user identities to Dragon Copilot—so the manifest captures that metadata consistently.

## Development Notes

- Shared helpers now live under `src/common`, keeping the CLI self-contained without external workspaces.
- `npm run build` emits compiled JS plus copies schemas/resources into `dist/`.
- `npm test` covers extension + connector flows (command registration, schema validation, CLI integration).

## Versioning & Releases

CLI releases are driven by git tags:

1. **Bump the version** (creates a tag automatically):
   ```bash
   npm version patch   # 1.0.0 → 1.0.1
   npm version minor   # 1.0.1 → 1.1.0
   npm version major   # 1.1.0 → 2.0.0
   ```
2. **Push the tag** to trigger a CI release:
   ```bash
   git push --tags
   ```
3. CI builds standalone binaries for each platform and publishes them to [GitHub Releases](../../releases).

## Troubleshooting

- **CLI Not Found**: Ensure `npm link` completes without error and your Node install adds the npm global bin directory to PATH.
- **Process Exit during Tests**: Tests set `process.exitCode` and mock logging. If you add new commands, ensure they don’t call `process.exit()` directly in unit scenarios.
- **Schema Errors**: Check the `src/schemas/*.json` files for the latest manifest requirements.
