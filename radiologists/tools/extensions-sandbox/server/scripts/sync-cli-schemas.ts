/**
 * Sync CLI-owned schemas into the sandbox.
 *
 * The Dragon Copilot (radiologists) extension manifest schema is owned by
 * `tools/dragon-copilot-cli`. Rather than committing a second copy of that
 * contract to the sandbox (which could silently diverge), we copy it in at
 * dev/build/test time from the CLI's authoritative path.
 *
 * The destination file is git-ignored — the single committed source of truth
 * is the CLI copy.
 *
 * NOTE: `radiologists-extensibility-api.yaml` is intentionally NOT synced here.
 * It does not exist in the CLI and remains a local sandbox copy (used to
 * generate the response schemas) until the service publishes an internal package.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MANIFEST_SCHEMA_FILE = 'radiologists-extension-manifest-schema.json';

// server/scripts -> repo root -> tools/dragon-copilot-cli/src/schemas/radiologists
const CLI_SCHEMA_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'tools',
  'dragon-copilot-cli',
  'src',
  'schemas',
  'radiologists',
  MANIFEST_SCHEMA_FILE,
);

// server/scripts -> server/src/schemas/radiologists
const DEST_DIR = resolve(__dirname, '..', 'src', 'schemas', 'radiologists');
const DEST_PATH = join(DEST_DIR, MANIFEST_SCHEMA_FILE);

if (!existsSync(CLI_SCHEMA_PATH)) {
  console.error(
    `[sync-cli-schemas] CLI manifest schema not found at:\n  ${CLI_SCHEMA_PATH}\n` +
      'The sandbox sources this contract from tools/dragon-copilot-cli. ' +
      'Ensure the CLI package is present.',
  );
  process.exit(1);
}

mkdirSync(DEST_DIR, { recursive: true });
copyFileSync(CLI_SCHEMA_PATH, DEST_PATH);
console.log(`[sync-cli-schemas] Synced ${MANIFEST_SCHEMA_FILE} from CLI -> ${DEST_PATH}`);
