/**
 * Sync externally-owned sources into the sandbox.
 *
 * The sandbox validates against two contracts it does not own, and generates
 * manifests with code it does not own:
 *
 * - `radiologists-extension-manifest-schema.json` — owned by `tools/dragon-copilot-cli`.
 * - `radiologists-extensibility-api.yaml` — owned by `radiologists/` (the copy the
 *   radiology samples are built against); the response and input schemas under
 *   `src/schemas/generated-schemas/` are derived from it.
 * - `src/cli/radiologists/` — the Dragon Copilot CLI's pure manifest core
 *   (`tools/dragon-copilot-cli/src/domains/radiologists/manifest/`), which backs
 *   the `/api/cli/generate` endpoint so the sandbox wizard and `dragon-copilot
 *   radiologists init` emit identical manifests.
 *
 * Rather than committing second copies of those sources to the sandbox (which
 * could silently diverge), we copy them in at dev/build/test time from their
 * authoritative paths. The destination files are git-ignored — the single
 * committed source of truth is the upstream copy in each case.
 *
 * `src/__tests__/schema-sync.test.ts` guards against drift.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// server/scripts -> server/src/schemas/radiologists
const DEST_DIR = resolve(__dirname, '..', 'src', 'schemas', 'radiologists');

// server/scripts -> repo root
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');

interface SyncTarget {
  /** Absolute path to the authoritative copy. */
  source: string;
  /** Where the contract is owned, used in the error message when it is missing. */
  owner: string;
}

const SYNC_TARGETS: SyncTarget[] = [
  {
    source: resolve(
      REPO_ROOT,
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

interface SyncDirTarget {
  /** Absolute path to the authoritative directory. */
  source: string;
  /** Absolute path the directory is mirrored to. */
  dest: string;
  /** Where the source is owned, used in the error message when it is missing. */
  owner: string;
  /** Only files with these extensions are copied. */
  extensions: string[];
}

const SYNC_DIR_TARGETS: SyncDirTarget[] = [
  {
    source: resolve(REPO_ROOT, 'tools', 'dragon-copilot-cli', 'src', 'domains', 'radiologists', 'manifest'),
    // server/scripts -> server/src/cli/radiologists
    dest: resolve(__dirname, '..', 'src', 'cli', 'radiologists'),
    owner: 'tools/dragon-copilot-cli',
    extensions: ['.ts'],
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

for (const { source, dest, owner, extensions } of SYNC_DIR_TARGETS) {
  const dirName = basename(source);

  if (!existsSync(source)) {
    console.error(
      `[sync-schemas] ${dirName}/ not found at:\n  ${source}\n` +
        `The sandbox sources this code from ${owner}. Ensure it is present.`,
    );
    process.exit(1);
  }

  const files = readdirSync(source).filter((file) => extensions.some((ext) => file.endsWith(ext)));

  if (files.length === 0) {
    console.error(`[sync-schemas] ${dirName}/ at ${source} contains no ${extensions.join('/')} files to sync.`);
    process.exit(1);
  }

  // Recreated from scratch so a file deleted upstream cannot linger here and
  // keep compiling against a contract that no longer exists.
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  for (const file of files) {
    copyFileSync(join(source, file), join(dest, file));
  }

  console.log(`[sync-schemas] Synced ${files.length} file(s) from ${owner}/${dirName} -> ${dest}`);
}
