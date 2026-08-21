import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { MANIFEST_SCHEMA_PATH, OPENAPI_SPEC_PATH } from '../utils/schema-path.js';

/**
 * Divergence guard: the sandbox owns neither of the contracts it validates against.
 * Both are synced in by `scripts/sync-schemas.ts` (run automatically before
 * dev/build/test) from the locations that do own them. These tests fail if a
 * synced copy drifts from its authoritative source, catching a stale or
 * hand-edited copy.
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
