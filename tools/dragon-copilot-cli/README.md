# Dragon Copilot CLI

The `dragon-copilot` CLI allows you to generate, validate, and package manifests for Dragon Copilot Physician Workflows and Clinical Application Connectors.

## Installation

### Option 1: Download standalone binary (Recommended)

Download the latest release for your platform from the [Releases page](../../releases). The binary is a self-contained executable—no Node.js installation required.

| Platform | Binary                  |
|----------|-------------------------|
| Windows  | `dragon-copilot-win.exe` |
| macOS    | `dragon-copilot-macos`   |
| Linux    | `dragon-copilot-linux`   |

After downloading, rename the binary to `dragon-copilot` (or `dragon-copilot.exe` on Windows) and add it to your system PATH:

**Windows (PowerShell)**
```powershell
# Move the binary to a directory already on your PATH, or create one and add it:
New-Item -ItemType Directory -Force "$env:USERPROFILE\.dragon-copilot"
Move-Item dragon-copilot-win.exe "$env:USERPROFILE\.dragon-copilot\dragon-copilot.exe"
[Environment]::SetEnvironmentVariable('Path', "$env:USERPROFILE\.dragon-copilot;$([Environment]::GetEnvironmentVariable('Path', 'User'))", 'User')
```

**macOS / Linux**
```bash
# Move the binary to a directory on your PATH:
chmod +x dragon-copilot-*
sudo mv dragon-copilot-* /usr/local/bin/dragon-copilot
```

Verify the installation:

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

The git tag is the single source of truth for the CLI version. The `version` field in `package.json` is a placeholder (`0.0.0-dev`) — CI injects the real version from the tag at build time.

### Cutting a release

1. **Merge** your changes to `main`.
2. **Tag the commit** you want to release with a `cli/v` prefix following [semver](https://semver.org/):
   ```bash
   git tag cli/v0.1.0 main
   git push origin cli/v0.1.0
   ```
3. CI automatically:
   - Sets the version in `package.json` from the tag
   - Builds and bundles the CLI
   - Produces standalone binaries for Windows, macOS, and Linux
   - Publishes them to [GitHub Releases](../../releases)

### Local dev builds

When running from source (`npm link`), the CLI reports `0.0.0-dev` to distinguish dev builds from official releases.

## Troubleshooting

- **CLI Not Found**: Ensure `npm link` completes without error and your Node install adds the npm global bin directory to PATH.
- **Process Exit during Tests**: Tests set `process.exitCode` and mock logging. If you add new commands, ensure they don’t call `process.exit()` directly in unit scenarios.
- **Schema Errors**: Check the `src/schemas/*.json` files for the latest manifest requirements.
