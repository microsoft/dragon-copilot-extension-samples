# Physician extension manifest schemas

| File | `schemaVersion` | Notes |
|------|-----------------|-------|
| `physician-extension-manifest-schema.json` | _(absent)_ | Original, unversioned format. Used when a manifest has no `schemaVersion`. |
| `physician-extension-manifest-schema-0.3.0.json` | `0.3.0` | Public 0.3.0 schema. Current default for new manifests. |

## Adding a version

1. Add `physician-extension-manifest-schema-<version>.json` to this folder. The bundler embeds every `.json` file here automatically.
2. Register it in `SCHEMA_VERSION_REGISTRY` in `src/domains/physician/shared/schema-validator.ts`. Mark it `preview: true` if it shouldn't become the default yet.
3. Add a migration step to `MIGRATION_STEPS` in `src/domains/physician/commands/migrate.ts`, plus templates for the version in `src/domains/physician/templates/index.ts`.
