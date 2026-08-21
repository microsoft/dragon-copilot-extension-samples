/**
 * Sync externally-owned schemas into the sandbox.
 *
 * The sandbox validates against two contracts it does not own:
 *
 * - `radiologists-extension-manifest-schema.json` — owned by `tools/dragon-copilot-cli`.
 * - `radiologists-extensibility-api.yaml` — owned by `radiologists/` (the copy the
 *   radiology samples are built against); the response and input schemas under
 *   `src/schemas/generated-schemas/` are derived from it.
 *
 * Rather than committing second copies of those contracts to the sandbox (which
 * could silently diverge), we copy them in at dev/build/test time from their
 * authoritative paths. The destination files are git-ignored — the single
 * committed source of truth is the upstream copy in each case.
 *
 * `src/__tests__/schema-sync.test.ts` guards against drift.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// server/scripts -> server/src/schemas/radiologists
const DEST_DIR = resolve(__dirname, '..', 'src', 'schemas', 'radiologists');

interface SyncTarget {
  /** Absolute path to the authoritative copy. */
  source: string;
  /** Where the contract is owned, used in the error message when it is missing. */
  owner: string;
}

const SYNC_TARGETS: SyncTarget[] = [
  {
    // server/scripts -> repo root -> tools/dragon-copilot-cli/src/schemas/radiologists
    source: resolve(
      __dirname, '..', '..', '..', '..', '..',
      'tools', 'dragon-copilot-cli', 'src', 'schemas', 'radiologists',
      'radiologists-extension-manifest-schema.json',
    ),
    owner: 'tools/dragon-copilot-cli',
  },
  {
    // server/scripts -> radiologists/radiologists-extensibility-api.yaml
    source: resolve(__dirname, '..', '..', '..', '..', 'radiologists-extensibility-api.yaml'),
    owner: 'radiologists/',
  },
];

mkdirSync(DEST_DIR, { recursive: true });

for (const { source, owner } of SYNC_TARGETS) {
  const fileName = basename(source);

  if (!existsSync(source)) {
    console.error(
      `[sync-schemas] ${fileName} not found at:\n  ${source}\n` +
        `The sandbox sources this contract from ${owner}. Ensure it is present.`,
    );
    process.exit(1);
  }

  const dest = join(DEST_DIR, fileName);
  copyFileSync(source, dest);
  console.log(`[sync-schemas] Synced ${fileName} from ${owner} -> ${dest}`);
}
