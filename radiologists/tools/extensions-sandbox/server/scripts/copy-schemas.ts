/**
 * Copy the JSON schemas under `src/schemas/` into `dist/schemas/`, preserving
 * their directory structure, so the compiled server can load them at runtime.
 *
 * `tsc` only emits compiled sources, so the JSON schemas have to be copied
 * separately. This is done with Node built-ins rather than a glob-based copy
 * tool to keep the build's dependency tree small.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// server/scripts -> server/src/schemas and server/dist/schemas
const SOURCE_DIR = resolve(__dirname, '..', 'src', 'schemas');
const DEST_DIR = resolve(__dirname, '..', 'dist', 'schemas');

function copyJsonFiles(sourceDir: string, destDir: string): number {
  let copied = 0;

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      copied += copyJsonFiles(sourcePath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      mkdirSync(destDir, { recursive: true });
      copyFileSync(sourcePath, destPath);
      copied++;
    }
  }

  return copied;
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`[copy-schemas] Schema directory not found at:\n  ${SOURCE_DIR}`);
  process.exit(1);
}

const count = copyJsonFiles(SOURCE_DIR, DEST_DIR);

if (count === 0) {
  console.error(`[copy-schemas] No .json files found under ${SOURCE_DIR}.`);
  process.exit(1);
}

console.log(`[copy-schemas] Copied ${count} file(s) from ${relative(process.cwd(), SOURCE_DIR)} -> ${relative(process.cwd(), DEST_DIR)}`);
