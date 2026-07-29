import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Resolved paths to the Dragon Copilot (radiologists) schemas.
 * Shared across route handlers, tests, and build scripts to avoid duplicating path resolution logic.
 *
 * NOTE: `radiologists-extension-manifest-schema.json` is owned by `tools/dragon-copilot-cli`
 * and synced into this folder at dev/build/test time by `scripts/sync-cli-schemas.ts`
 * (the local copy is git-ignored, so the CLI holds the single source of truth).
 * `radiologists-extensibility-api.yaml` is still a local copy from diag-radex-extension-service
 * — it does not exist in the CLI and will be replaced with an internal package reference once
 * the service publishes its authoritative version.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMAS_DIR = join(__dirname, '..', 'schemas', 'radiologists');

export const MANIFEST_SCHEMA_PATH = join(SCHEMAS_DIR, 'radiologists-extension-manifest-schema.json');
export const OPENAPI_SPEC_PATH = join(SCHEMAS_DIR, 'radiologists-extensibility-api.yaml');
