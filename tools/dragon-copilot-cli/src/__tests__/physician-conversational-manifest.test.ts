import { describe, expect, test, afterAll } from '@jest/globals';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { load } from 'js-yaml';
import { validateExtensionManifest, PLACEHOLDER_TENANT_ID } from '../domains/physician/shared/schema-validator.js';
import { getConversationalToolTemplate, getTemplate, listTemplates, TEMPLATE_FOR_TOOL_TYPE } from '../domains/physician/templates/index.js';
import { CONVERSATIONAL_TOOL_TYPES, V040_SCHEMA_VERSION } from '../domains/physician/types.js';
import type { ConversationalTool, ConversationalToolType } from '../domains/physician/types.js';
import { generateManifest } from '../domains/physician/commands/generate.js';
import { packageExtension } from '../domains/physician/commands/package.js';

const fixturesDir = resolve(process.cwd(), 'src', '__tests__', 'fixtures', 'physician', V040_SCHEMA_VERSION);
const conversationalTemplates = Object.values(TEMPLATE_FOR_TOOL_TYPE);
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

const withTools = (...tools: unknown[]) => ({ ...envelope, tools });
const validate = validateExtensionManifest;

describe('physician manifest schema 0.4.0-preview.2 (conversational tools)', () => {
  test.each(loadCases('valid'))('accepts %s', (_name, manifest) => {
    const result = validate(manifest);
    expect(result.errors).toEqual([]);
  });

  test.each(loadCases('invalid'))('rejects %s', (_name, manifest) => {
    expect(validate(manifest).isValid).toBe(false);
  });

  const sampleManifests = [
    'physician/manifest/0.4.0-preview.2/manifest-example.yaml',
    'physician/src/samples/DragonCopilot/Conversational/Mcp/SampleConversational.Mcp.Web/extension.yaml',
    'physician/src/samples/DragonCopilot/Conversational/OpenApi/SampleConversational.OpenApi.Web/extension.yaml',
    'physician/src/samples/DragonCopilot/Conversational/CopilotStudio/extension.yaml',
  ];

  test.each(sampleManifests)('repository sample %s is valid', relativePath => {
    const file = join(repoRoot, relativePath);
    expect(existsSync(file)).toBe(true);
    const result = validate(load(readFileSync(file, 'utf8')));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  describe('manifest reference README', () => {
    const referenceDir = join(repoRoot, 'physician', 'manifest', V040_SCHEMA_VERSION);
    const readme = readFileSync(join(referenceDir, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
    const schema = JSON.parse(readFileSync(join(referenceDir, 'manifest-schema.json'), 'utf8'));

    function collect(node: unknown, enums: Set<string>): void {
      if (Array.isArray(node)) { node.forEach(n => collect(n, enums)); return; }
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj.enum)) obj.enum.forEach(v => enums.add(String(v)));
      if (typeof obj.const === 'string') enums.add(obj.const);
      Object.values(obj).forEach(v => collect(v, enums));
    }
    const enumValues = new Set<string>();
    collect(schema, enumValues);
    // Closed list: adding a source must be a deliberate change to this test, the schema and the README.
    const supportedSources = [
      'transcript', 'transcriptTurns', 'patientContext', 'conversationId', 'locale', 'mrn',
      'organizationId', 'sessionUniqueId', 'sessionStart', 'correlationId', 'requestId',
      'practitionerId', 'practitionerSpecialty',
    ];
    const fieldNames = new Set<string>([
      ...Object.keys(schema.properties),
      ...schema.definitions.Tool.propertyNames.enum,
      ...Object.keys(schema.definitions.RuntimeParamBinding.properties),
      ...Object.keys(schema.definitions.DragonInput.properties),
      ...Object.keys(schema.definitions.AuthConfig.properties),
    ]);

    test.each([...enumValues])('documents enum value %s', value => {
      expect(readme).toContain(`\`${value}\``);
    });

    test('runtime parameter sources are exactly the supported set', () => {
      expect([...schema.definitions.RuntimeParamSource.enum].sort()).toEqual([...supportedSources].sort());
    });

    test.each([...fieldNames])('documents field %s', field => {
      expect(readme).toContain(`\`${field}\``);
    });

    test('every full tool example in the reference is valid', () => {
      const blocks = [...readme.matchAll(/```yaml\n(- name:[\s\S]*?)```/g)].map(m => load(m[1]) as unknown[]);
      expect(blocks.length).toBeGreaterThanOrEqual(4);
      for (const tools of blocks) {
        expect(validate(withTools(...tools)).errors).toEqual([]);
      }
    });
  });
  test('public schema and CLI-bundled schema are identical', () => {
    const publicSchema = readFileSync(join(repoRoot, 'physician', 'manifest', V040_SCHEMA_VERSION, 'manifest-schema.json'), 'utf8');
    const bundledSchema = readFileSync(resolve(process.cwd(), 'src', 'schemas', 'physician', `physician-extension-manifest-schema-${V040_SCHEMA_VERSION}.json`), 'utf8');
    const normalizeEol = (s: string) => s.replace(/\r\n/g, '\n');
    expect(normalizeEol(bundledSchema)).toBe(normalizeEol(publicSchema));
    expect(JSON.parse(bundledSchema)).toEqual(JSON.parse(publicSchema));
  });

  test('rejects duplicate tool names', () => {
    const result = validate(withTools(getConversationalToolTemplate('MCP'), getConversationalToolTemplate('MCP')));
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.keyword === 'uniqueToolNames')).toBe(true);
  });

  test('rejects integration types outside the public preview set', () => {
    const tool = { ...getConversationalToolTemplate('MCP'), type: 'Unknown' };
    expect(validate(withTools(tool)).isValid).toBe(false);
  });

  test('warns when extractors reference an operation that is not exposed', () => {
    const tool = getConversationalToolTemplate('OpenAPI');
    tool.expose = ['somethingElse'];
    const result = validate(withTools(tool));
    expect(result.isValid).toBe(true);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  test('rejects conversational tool types under schema 0.3.0', () => {
    const result = validate({ ...withTools(getConversationalToolTemplate('MCP')), schemaVersion: '0.3.0' });
    expect(result.isValid).toBe(false);
  });

  test('accepts DragonAPI and conversational tools in one manifest', () => {
    const dragonApi = (getTemplate('note-analysis', V040_SCHEMA_VERSION) as { tools: unknown[] }).tools[0];
    const result = validate(withTools(dragonApi, getConversationalToolTemplate('MCP')));
    expect(result.errors).toEqual([]);
  });

  test.each(listTemplates(V040_SCHEMA_VERSION))('0.4.0 template %s produces a valid manifest', name => {
    const template = getTemplate(name, V040_SCHEMA_VERSION);
    const result = validate({ auth: { tenantId: PLACEHOLDER_TENANT_ID }, ...template });
    expect(result.errors).toEqual([]);
  });

  test.each(CONVERSATIONAL_TOOL_TYPES)('%s tool template validates and is not listed for 0.3.0', (type: ConversationalToolType) => {
    const tool: ConversationalTool = getConversationalToolTemplate(type);
    expect(tool.type).toBe(type);
    expect(validate(withTools(tool)).errors).toEqual([]);
    expect(listTemplates('0.3.0')).not.toContain(TEMPLATE_FOR_TOOL_TYPE[type]);
  });
});

describe('physician 0.4.0 conversational commands', () => {
  const workDir = mkdtempSync(join(tmpdir(), 'dragon-conversational-'));
  afterAll(() => rmSync(workDir, { recursive: true, force: true }));

  test.each(conversationalTemplates)('generate --template %s writes a valid manifest into a new directory', async template => {
    const manifestPath = join(workDir, 'nested', template, 'extension.yaml');
    await generateManifest({ template, output: manifestPath, schemaVersion: V040_SCHEMA_VERSION });
    expect(validate(load(readFileSync(manifestPath, 'utf8'))).errors).toEqual([]);
  });

  test('generate --template rejects templates unknown to the schema version', async () => {
    await expect(generateManifest({ template: 'mcp', output: join(workDir, 'v030.yaml'), schemaVersion: '0.3.0' })).rejects.toThrow(/not found/);
  });

  test('generate --template writes a manifest and package zips it', async () => {
    const manifestPath = join(workDir, 'extension.yaml');
    await generateManifest({ template: 'mcp', output: manifestPath, schemaVersion: V040_SCHEMA_VERSION });

    const manifest = load(readFileSync(manifestPath, 'utf8')) as { schemaVersion: string; tools: Array<{ type: string }> };
    expect(manifest.schemaVersion).toBe(V040_SCHEMA_VERSION);
    expect(manifest.tools.map(t => t.type)).toEqual(['MCP']);
    expect(validate(manifest).isValid).toBe(true);


    const zipPath = join(workDir, 'out.zip');
    await packageExtension({ manifest: manifestPath, output: zipPath, silent: true });
    expect(existsSync(zipPath)).toBe(true);

    const manifestBefore = readFileSync(manifestPath, 'utf8');
    await expect(packageExtension({ manifest: manifestPath, output: manifestPath, silent: true })).rejects.toThrow(/would overwrite input/);
    const includePath = join(workDir, 'README.md');
    writeFileSync(includePath, 'readme');
    await expect(packageExtension({ manifest: manifestPath, output: includePath, include: [includePath], silent: true })).rejects.toThrow(/would overwrite input/);
    expect(readFileSync(manifestPath, 'utf8')).toBe(manifestBefore);
    expect(readFileSync(includePath, 'utf8')).toBe('readme');
  });

  test('package rejects an invalid manifest', async () => {
    const manifestPath = join(workDir, 'invalid.yaml');
    writeFileSync(manifestPath, `schemaVersion: ${V040_SCHEMA_VERSION}\nname: Bad Name\n`);
    await expect(packageExtension({ manifest: manifestPath, silent: true })).rejects.toThrow(/validation failed/);
  });
});
