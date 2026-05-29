import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Resolved path to the Dragon Copilot extension manifest JSON schema.
 * Shared across route handlers and tests to avoid duplicating path resolution logic.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const MANIFEST_SCHEMA_PATH = join(__dirname, '..', 'schemas', 'extension-manifest.json');
