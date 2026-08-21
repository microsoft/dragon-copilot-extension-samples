import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Resolved paths to the Dragon Copilot (radiologists) schemas.
 * Shared across route handlers, tests, and build scripts to avoid duplicating path resolution logic.
 *
 * NOTE: the sandbox owns neither of these contracts. Both are synced into this folder at
 * dev/build/test time by `scripts/sync-schemas.ts` and are git-ignored locally, so the
 * upstream copy holds the single source of truth in each case:
 * - `radiologists-extension-manifest-schema.json` is owned by `tools/dragon-copilot-cli`.
 * - `radiologists-extensibility-api.yaml` is owned by `radiologists/`, and will be replaced
 *   with an internal package reference once `diag-radex-extension-service` publishes its
 *   authoritative version.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMAS_DIR = join(__dirname, '..', 'schemas', 'radiologists');

export const MANIFEST_SCHEMA_PATH = join(SCHEMAS_DIR, 'radiologists-extension-manifest-schema.json');
export const OPENAPI_SPEC_PATH = join(SCHEMAS_DIR, 'radiologists-extensibility-api.yaml');
