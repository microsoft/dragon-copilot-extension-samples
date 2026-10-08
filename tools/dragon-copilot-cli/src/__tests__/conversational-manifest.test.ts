import { describe, expect, test, afterAll } from '@jest/globals';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { load } from 'js-yaml';
import { validateConversationalManifest } from '../domains/conversational/shared/schema-validator.js';
import { getToolTemplate, listTemplates, createManifest } from '../domains/conversational/templates/index.js';
import { generateManifest } from '../domains/conversational/commands/generate.js';
import { packageExtension } from '../domains/conversational/commands/package.js';

const fixturesDir = resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'conversational');
const repoRoot = resolve(process.cwd(), '..', '..');

const envelope = {
  schemaVersion: '0.4.0-preview.2',
  name: 'fixture-extension',
  caption: 'Fixture Extension',
  description: 'Fixture envelope.',
  version: '0.1.0',
  auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
};

type FixtureCase = { description: string; tool?: unknown; manifest?: unknown };

function loadCases(kind: 'valid' | 'invalid'): Array<[string, unknown]> {
  const dir = join(fixturesDir, kind);
  return readdirSync(dir)
    .filter(file => file.endsWith('.yaml'))
    .flatMap(file => (load(readFileSync(join(dir, file), 'utf8')) as FixtureCase[]).map(
      c => [`${file}: ${c.description}`, c.manifest ?? { ...envelope, tools: [c.tool] }] as [string, unknown],
    ));
}

const details = {
  name: 'test-extension',
  caption: 'Test Extension',
  description: 'Test',
  version: '1.0.0',
  tenantId: '00000000-0000-0000-0000-000000000000',
};

describe('conversational manifest schema 0.4.0-preview.2', () => {
  test.each(loadCases('valid'))('accepts %s', (_name, manifest) => {
    const result = validateConversationalManifest(manifest);
    expect(result.errors).toEqual([]);
  });

  test.each(loadCases('invalid'))('rejects %s', (_name, manifest) => {
    expect(validateConversationalManifest(manifest).isValid).toBe(false);
  });

  const sampleManifests = [
    'conversational/manifest/0.4.0-preview.2/manifest-example.yaml',
    'conversational/src/samples/Mcp/SampleConversational.Mcp.Web/extension.yaml',
    'conversational/src/samples/OpenApi/SampleConversational.OpenApi.Web/extension.yaml',
    'conversational/src/samples/CopilotStudio/extension.yaml',
  ];

  test.each(sampleManifests)('repository sample %s is valid', relativePath => {
    const file = join(repoRoot, relativePath);
    expect(existsSync(file)).toBe(true);
    const result = validateConversationalManifest(load(readFileSync(file, 'utf8')));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test('rejects duplicate tool names', () => {
    const tool = getToolTemplate('mcp');
    const result = validateConversationalManifest(createManifest(details, [tool, getToolTemplate('mcp')]));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.keyword === 'uniqueToolNames')).toBe(true);
  });

  test('rejects integration types outside the public preview set', () => {
    const tool = { ...getToolTemplate('mcp'), type: 'A2A' };
    expect(validateConversationalManifest(createManifest(details, [tool as never])).isValid).toBe(false);
  });

  test('warns when extractors reference an operation that is not exposed', () => {
    const tool = getToolTemplate('openapi');
    tool.expose = ['somethingElse'];
    const result = validateConversationalManifest(createManifest(details, [tool]));
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test.each(listTemplates())('template %s produces a valid manifest', name => {
    const result = validateConversationalManifest(createManifest(details, [getToolTemplate(name)]));
    expect(result.errors).toEqual([]);
  });
});

describe('conversational commands', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'dragon-conversational-'));
  afterAll(() => rmSync(workDir, { recursive: true, force: true }));

  test('generate --template builds a multi-tool manifest and package zips it', async () => {
    const manifestPath = join(workDir, 'extension.yaml');
    for (const template of listTemplates()) {
      await generateManifest({ template, output: manifestPath });
    }

    const manifest = load(readFileSync(manifestPath, 'utf8')) as { tools: Array<{ type: string }> };
    expect(manifest.tools.map(t => t.type)).toEqual(['MCP', 'OpenAPI', 'CopilotStudio']);
    expect(validateConversationalManifest(manifest).isValid).toBe(true);

    await expect(generateManifest({ template: 'mcp', output: manifestPath })).rejects.toThrow(/already exists/);

    const zipPath = join(workDir, 'out.zip');
    await expect(packageExtension({ manifest: manifestPath, output: zipPath, silent: true })).resolves.toBe(zipPath);
    expect(existsSync(zipPath)).toBe(true);
  });

  test('package rejects an invalid manifest', async () => {
    const manifestPath = join(workDir, 'invalid.yaml');
    writeFileSync(manifestPath, 'schemaVersion: 0.4.0-preview.2\nname: Bad Name\n');
    await expect(packageExtension({ manifest: manifestPath, silent: true })).rejects.toThrow(/validation failed/);
  });
});
