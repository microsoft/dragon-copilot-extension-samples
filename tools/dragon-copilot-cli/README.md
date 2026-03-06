# Dragon Copilot CLI

The `dragon-copilot` CLI allows you to generate, validate, and package manifests for Dragon Copilot Workflow Extensions and Clinical Application Connectors.

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
| Extension  | `dragon-copilot extension init`                        | Interactive wizard that generates an extension manifest and publisher configuration |
| Extension  | `dragon-copilot extension validate ./extension.yaml`   | Validates the manifest and optional `publisher.json` against JSON schema + business rules |
| Extension  | `dragon-copilot extension package`                     | Produces a zip payload ready for distribution |
| Connector  | `dragon-copilot connector init`                          | Clinical Application Connector manifest wizard (note sections, context retrieval, authentication) |
| Connector  | `dragon-copilot connector validate ./extension.yaml`   | Validates Clinical Application Connector manifests and publisher settings |
| Connector  | `dragon-copilot connector package`                     | Produces a zip payload ready for distribution |

Use `dragon-copilot --help` or `dragon-copilot <domain> --help` for additional options.

During the connector wizard you will be asked to confirm a **clinical application name**—typically the embedded EHR or workflow integration that issues user identities to Dragon Copilot—so the manifest captures that metadata consistently.

## Development Notes

- Shared helpers now live under `src/common`, keeping the CLI self-contained without external workspaces.
- `npm run build` emits compiled JS plus copies schemas/resources into `dist/`.
- `npm test` covers extension + connector flows (command registration, schema validation, CLI integration).

## Troubleshooting

- **CLI Not Found**: Ensure `npm link` completes without error and your Node install adds the npm global bin directory to PATH.
- **Process Exit during Tests**: Tests set `process.exitCode` and mock logging. If you add new commands, ensure they don’t call `process.exit()` directly in unit scenarios.
- **Schema Errors**: Check the `src/schemas/*.json` files for the latest manifest requirements.
