import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { MANIFEST_SCHEMA_PATH, OPENAPI_SPEC_PATH } from '../utils/schema-path.js';

/**
 * Divergence guard: the sandbox owns neither the contracts it validates against
 * nor the manifest-generation code behind `/api/cli/generate`. All of them are
 * synced in by `scripts/sync-schemas.ts` (run automatically before dev/build/test)
 * from the locations that do own them. These tests fail if a synced copy drifts
 * from its authoritative source, catching a stale or hand-edited copy.
 */

// server/src/__tests__ -> repo root -> tools/dragon-copilot-cli/src/schemas/radiologists
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

// server/src/__tests__ -> radiologists/radiologists-extensibility-api.yaml
const RADIOLOGISTS_SPEC_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'radiologists-extensibility-api.yaml',
);

// server/src/__tests__ -> repo root -> tools/dragon-copilot-cli/src/domains/radiologists/manifest
const CLI_MANIFEST_LIB_PATH = resolve(
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
  'domains',
  'radiologists',
  'manifest',
);

// server/src/__tests__ -> server/src/cli/radiologists
const SANDBOX_MANIFEST_LIB_PATH = resolve(__dirname, '..', 'cli', 'radiologists');

/** Line endings differ between checkouts, so compare content rather than bytes. */
function readNormalized(path: string): string {
  return readFileSync(path, 'utf-8').replace(/\r\n/g, '\n');
}

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

describe('OpenAPI spec sync', () => {
  it('has a synced OpenAPI spec present in the sandbox', () => {
    expect(existsSync(OPENAPI_SPEC_PATH)).toBe(true);
  });

  it('matches the radiologists authoritative source (no drift)', () => {
    expect(existsSync(RADIOLOGISTS_SPEC_PATH)).toBe(true);

    // Compared as parsed documents rather than raw text so that a difference in
    // trailing newline or line endings is not reported as a contract drift.
    const sandboxSpec = yaml.load(readFileSync(OPENAPI_SPEC_PATH, 'utf-8'));
    const radiologistsSpec = yaml.load(readFileSync(RADIOLOGISTS_SPEC_PATH, 'utf-8'));

    expect(sandboxSpec).toEqual(radiologistsSpec);
  });
});

describe('CLI manifest core sync', () => {
  it('has the synced manifest core present in the sandbox', () => {
    expect(existsSync(SANDBOX_MANIFEST_LIB_PATH)).toBe(true);
    expect(readdirSync(SANDBOX_MANIFEST_LIB_PATH).length).toBeGreaterThan(0);
  });

  it('mirrors every file from the CLI authoritative source (no drift)', () => {
    expect(existsSync(CLI_MANIFEST_LIB_PATH)).toBe(true);

    const cliFiles = readdirSync(CLI_MANIFEST_LIB_PATH).filter((file) => file.endsWith('.ts')).sort();
    const sandboxFiles = readdirSync(SANDBOX_MANIFEST_LIB_PATH).filter((file) => file.endsWith('.ts')).sort();

    expect(sandboxFiles).toEqual(cliFiles);

    for (const file of cliFiles) {
      expect(readNormalized(resolve(SANDBOX_MANIFEST_LIB_PATH, file))).toBe(
        readNormalized(resolve(CLI_MANIFEST_LIB_PATH, file)),
      );
    }
  });

  it('keeps the synced core free of CLI-only dependencies', () => {
    // Anything beyond js-yaml (prompts, chalk, fs-extra, node:fs, …) would not
    // resolve in the sandbox server and would break its build.
    const forbidden = /from '(?!\.\/|js-yaml')/;

    for (const file of readdirSync(SANDBOX_MANIFEST_LIB_PATH).filter((name) => name.endsWith('.ts'))) {
      const source = readNormalized(resolve(SANDBOX_MANIFEST_LIB_PATH, file));
      expect(source, `${file} imports a dependency the sandbox cannot resolve`).not.toMatch(forbidden);
    }
  });
});
