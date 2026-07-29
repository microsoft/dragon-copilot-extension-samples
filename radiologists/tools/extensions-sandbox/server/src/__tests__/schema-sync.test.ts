import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MANIFEST_SCHEMA_PATH } from '../utils/schema-path.js';

/**
 * Divergence guard: the sandbox does NOT own the radiologists extension manifest
 * schema. It is synced from `tools/dragon-copilot-cli` by `scripts/sync-cli-schemas.ts`
 * (run automatically before dev/build/test). This test fails if the synced copy
 * drifts from the CLI's authoritative source, catching a stale or hand-edited copy.
 */
const CLI_SCHEMA_PATH = resolve(
  __dirname,
  '..',
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
  'radiologists-extension-manifest-schema.json',
);

describe('Manifest schema sync', () => {
  it('has a synced manifest schema present in the sandbox', () => {
    expect(existsSync(MANIFEST_SCHEMA_PATH)).toBe(true);
  });

  it('matches the CLI authoritative source (no drift)', () => {
    expect(existsSync(CLI_SCHEMA_PATH)).toBe(true);

    const sandboxSchema = JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, 'utf-8'));
    const cliSchema = JSON.parse(readFileSync(CLI_SCHEMA_PATH, 'utf-8'));

    expect(sandboxSchema).toEqual(cliSchema);
  });
});
