import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Resolved paths to the Dragon Copilot (radiologists) schemas.
 * Shared across route handlers, tests, and build scripts to avoid duplicating path resolution logic.
 *
 * NOTE: These schemas are temporarily copied from diag-radex-extension-service and will be
 * replaced with internal references (e.g. from dragon-copilot-cli) once those are in sync
 * with the service's authoritative versions.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMAS_DIR = join(__dirname, '..', 'schemas', 'radiologists');

export const MANIFEST_SCHEMA_PATH = join(SCHEMAS_DIR, 'radiologists-extension-manifest-schema.json');
export const OPENAPI_SPEC_PATH = join(SCHEMAS_DIR, 'radiologists-extensibility-api.yaml');
