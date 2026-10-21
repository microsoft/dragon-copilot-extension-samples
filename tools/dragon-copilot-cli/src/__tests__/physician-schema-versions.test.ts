import { describe, expect, test, beforeEach, afterEach, afterAll, jest } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Command } from 'commander';
import { load } from 'js-yaml';
import { registerCommands } from '../commands/index.js';
import {
  validateExtensionManifest,
  getSchemaVersions,
  getManifestSchemaVersion,
  resolveRequestedSchemaVersion,
  LATEST_SCHEMA_VERSION,
  LEGACY_SCHEMA_VERSION
} from '../domains/physician/shared/schema-validator.js';
import {
  validateToolName,
  validateTimeout,
  humanizeName,
  buildV030Inputs,
  ADAPTIVE_CARD_CONTENT_TYPE
} from '../domains/physician/shared/prompts.js';
import { buildManifest, buildTool } from '../domains/physician/shared/manifest-builder.js';
import { getTemplate } from '../domains/physician/templates/index.js';
import { getMigrationVersions } from '../domains/physician/commands/migrate.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function buildV030Manifest(): Record<string, any> {
  return {
    schemaVersion: '0.3.0',
    name: 'test-extension',
    caption: 'Test Extension',
    description: 'Extension used for 0.3.0 validation tests',
    version: '1.2.3',
    auth: { tenantId: TENANT_ID },
    tools: [
      {
        name: 'note-tool',
        caption: 'Note Tool',
        description: 'Processes clinical notes',
        type: 'DragonAPI',
        triggers: ['DataAvailable'],
        endpoint: 'https://example.org/extension/process',
        inputs: [
          {
            name: 'note',
            description: 'Clinical note payload',
            'content-type': 'application/vnd.ms-dragon.dsp.note+json'
          }
        ],
        outputs: [
          {
            name: 'result-card',
            description: 'Adaptive Card output',
            'content-type': 'application/vnd.ms-dragon.dsp+json'
          }
        ]
      }
    ]
  };
}

const LEGACY_MANIFEST_YAML = [
  'name: legacy-extension',
  'description: Legacy manifest used in migration tests',
  'version: 0.0.1',
  'auth:',
  '  tenantId: 00000000-0000-0000-0000-000000000001',
  'tools:',
  '  - name: note-tool',
  '    description: Processes clinical notes',
  '    endpoint: https://example.org/process',
  '    trigger: AdaptiveCardAction',
  '    inputs:',
  '      - name: note',
  '        description: Clinical note payload',
  '        data: DSP/Note',
  '    outputs:',
  '      - name: result',
  '        description: Inference output payload',
  '        data: DSP',
  '  - name: transcript-tool',
  '    description: Processes transcripts',
  '    endpoint: https://example.org/transcript',
  '    inputs:',
  '      - name: transcript',
  '        description: Transcript payload',
  '        content-type: application/vnd.ms-dragon.dsp.transcript+json',
  '    outputs:',
  '      - name: result',
  '        description: Inference output payload',
  '        content-type: application/vnd.ms-dragon.dsp+json',
].join('\n');

describe('physician schema version routing', () => {
  test('latest schema version is 0.3.0', () => {
    expect(LATEST_SCHEMA_VERSION).toBe('0.3.0');
    expect(getSchemaVersions().map(v => v.version)).toEqual(['0.3.0', LEGACY_SCHEMA_VERSION]);
  });

  test('every supported schema version is reachable by migrate', () => {
    const migratable = getMigrationVersions();
    for (const { version } of getSchemaVersions()) {
      expect(migratable).toContain(version);
    }
  });

  test.each([
    ['a non-array tools value', 'ab'],
    ['null tool entries', [null, null]]
  ])('reports schema errors instead of throwing for %s', (_label, tools) => {
    const manifest = { ...buildV030Manifest(), tools };
    let result: ReturnType<typeof validateExtensionManifest> | undefined;
    expect(() => { result = validateExtensionManifest(manifest); }).not.toThrow();
    expect(result?.isValid).toBe(false);
    expect(result?.errors.length).toBeGreaterThan(0);
  });

  test('accepts a valid 0.3.0 manifest and reports its version', () => {
    const result = validateExtensionManifest(buildV030Manifest());
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
    expect(result.schemaVersion).toBe('0.3.0');
  });

  test('manifest without schemaVersion is validated against the legacy schema', () => {
    const manifest = buildV030Manifest();
    delete manifest.schemaVersion;
    const result = validateExtensionManifest(manifest);
    expect(result.schemaVersion).toBe(LEGACY_SCHEMA_VERSION);
    // 0.3.0-only fields are rejected by the legacy schema.
    expect(result.isValid).toBe(false);
  });

  test.each([['9.9.9'], [''], [123], [null]])('rejects unsupported schemaVersion %p', (value) => {
    const manifest = { ...buildV030Manifest(), schemaVersion: value };
    const result = validateExtensionManifest(manifest);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.keyword).toBe('unsupportedSchemaVersion');
    expect(result.errors[0]?.instancePath).toBe('/schemaVersion');
  });

  test('getManifestSchemaVersion distinguishes absent from invalid values', () => {
    expect(getManifestSchemaVersion({})).toBe(LEGACY_SCHEMA_VERSION);
    expect(getManifestSchemaVersion({ schemaVersion: '0.3.0' })).toBe('0.3.0');
    expect(getManifestSchemaVersion({ schemaVersion: 123 })).toBe('123');
  });

  test('resolveRequestedSchemaVersion defaults to latest and rejects unknown versions', () => {
    expect(resolveRequestedSchemaVersion()).toBe('0.3.0');
    expect(resolveRequestedSchemaVersion('legacy')).toBe(LEGACY_SCHEMA_VERSION);
    expect(() => resolveRequestedSchemaVersion('9.9.9')).toThrow(/Unsupported schema version/);
  });
});

describe('physician 0.3.0 schema rules', () => {
  function expectInvalid(mutate: (manifest: Record<string, any>) => void): void {
    const manifest = buildV030Manifest();
    mutate(manifest);
    expect(validateExtensionManifest(manifest).isValid).toBe(false);
  }

  test.each([
    ['missing extension caption', (m: Record<string, any>) => { delete m.caption; }],
    ['missing tool caption', (m: Record<string, any>) => { delete m.tools[0].caption; }],
    ['missing triggers', (m: Record<string, any>) => { delete m.tools[0].triggers; }],
    ['empty triggers', (m: Record<string, any>) => { m.tools[0].triggers = []; }],
    ['missing type', (m: Record<string, any>) => { delete m.tools[0].type; }],
    ['unknown trigger', (m: Record<string, any>) => { m.tools[0].triggers = ['OnDemand']; }],
    ['non-DragonAPI type', (m: Record<string, any>) => { m.tools[0].type = 'CustomType'; }],
    ['unknown tool field', (m: Record<string, any>) => { m.tools[0].unexpected = true; }],
    ['legacy trigger field', (m: Record<string, any>) => { m.tools[0].trigger = 'AutoRun'; }],
    ['tool name starting with a digit', (m: Record<string, any>) => { m.tools[0].name = '1-tool'; }],
    ['timeout below 3', (m: Record<string, any>) => { m.tools[0].timeout = 2; }],
    ['timeout above 60', (m: Record<string, any>) => { m.tools[0].timeout = 61; }],
    ['legacy data field on input', (m: Record<string, any>) => {
      delete m.tools[0].inputs[0]['content-type'];
      m.tools[0].inputs[0].data = 'DSP/Note';
    }],
    ['EHR context input without include', (m: Record<string, any>) => {
      m.tools[0].inputs.push({ name: 'ehr', description: 'EHR', 'content-type': 'application/fhir.ehr-context+json' });
    }],
    ['include on a non-EHR input', (m: Record<string, any>) => { m.tools[0].inputs[0].include = ['patient']; }],
  ])('rejects %s', (_label, mutate) => {
    expectInvalid(mutate);
  });

  test('accepts timeout bounds, optional outputs and an EHR context input with include', () => {
    const manifest = buildV030Manifest();
    manifest.tools[0].timeout = 3;
    delete manifest.tools[0].outputs;
    manifest.tools[0].inputs.push({
      name: 'ehr-context',
      description: 'EHR context',
      'content-type': 'application/fhir.ehr-context+json',
      include: ['patient', 'problem-list'],
      required: false
    });
    expect(validateExtensionManifest(manifest).errors).toEqual([]);

    manifest.tools[0].timeout = 60;
    expect(validateExtensionManifest(manifest).isValid).toBe(true);
  });
});

describe('physician version-aware helpers', () => {
  test('validateToolName applies the per-version name rule', () => {
    expect(validateToolName('1-tool', null, LEGACY_SCHEMA_VERSION)).toBe(true);
    expect(typeof validateToolName('1-tool', null, '0.3.0')).toBe('string');
    expect(validateToolName('tool-1', null, '0.3.0')).toBe(true);
  });

  test('validateTimeout allows blank and 3-60 whole seconds', () => {
    expect(validateTimeout('')).toBe(true);
    expect(validateTimeout('3')).toBe(true);
    expect(validateTimeout('60')).toBe(true);
    expect(typeof validateTimeout('2')).toBe('string');
    expect(typeof validateTimeout('5.5')).toBe('string');
  });

  test('humanizeName builds a caption from a kebab-case name', () => {
    expect(humanizeName('note-analyzer')).toBe('Note Analyzer');
  });

  test('builder output for 0.3.0 passes validation', () => {
    const manifest = buildManifest(
      { name: 'built-extension', description: 'Built', version: '0.0.1' },
      { tenantId: TENANT_ID },
      '0.3.0'
    );
    (manifest.tools as unknown[]).push(buildTool({
      toolName: 'ehr-tool',
      toolDescription: 'Uses EHR context',
      endpoint: 'https://example.org/process',
      inputTypes: ['application/vnd.ms-dragon.dsp.note+json', 'application/fhir.ehr-context+json'],
      ehrInclude: ['patient'],
      outputs: [{ name: 'card', description: 'Card', 'content-type': 'application/vnd.ms-dragon.dsp+json' }]
    }, '0.3.0'));

    const result = validateExtensionManifest(manifest);
    expect(result.errors).toEqual([]);
    expect(Object.keys(manifest)[0]).toBe('schemaVersion');
  });

  test('builder output for legacy passes legacy validation', () => {
    const manifest = buildManifest(
      { name: 'built-extension', description: 'Built', version: '0.0.1' },
      { tenantId: TENANT_ID },
      LEGACY_SCHEMA_VERSION
    );
    (manifest.tools as unknown[]).push(buildTool({
      toolName: 'note-tool',
      toolDescription: 'Notes',
      endpoint: 'https://example.org/process',
      inputTypes: ['application/vnd.ms-dragon.dsp.note+json'],
      outputs: [{ name: 'card', description: 'Card', 'content-type': 'application/vnd.ms-dragon.dsp+json' }]
    }, LEGACY_SCHEMA_VERSION));

    const result = validateExtensionManifest(manifest);
    expect(result.errors).toEqual([]);
    expect(result.schemaVersion).toBe(LEGACY_SCHEMA_VERSION);
  });

  test.each([['note-analysis'], ['speech-analysis']])('%s template exists for each version', (name) => {
    const latest = getTemplate(name) as Record<string, any>;
    expect(latest.schemaVersion).toBe('0.3.0');
    // Templates intentionally omit auth, so add it before validating.
    expect(validateExtensionManifest({ ...latest, auth: { tenantId: TENANT_ID } }).errors).toEqual([]);

    const legacy = getTemplate(name, LEGACY_SCHEMA_VERSION) as Record<string, any>;
    expect(legacy.schemaVersion).toBeUndefined();
    expect(validateExtensionManifest({ ...legacy, auth: { tenantId: TENANT_ID } }).errors).toEqual([]);
  });

  test.each([['note-suggestions'], ['audio-analysis']])('0.3.0-only %s template is valid', (name) => {
    const template = getTemplate(name) as Record<string, any>;
    expect(validateExtensionManifest({ ...template, auth: { tenantId: TENANT_ID } }).errors).toEqual([]);
    expect(() => getTemplate(name, LEGACY_SCHEMA_VERSION)).toThrow();
  });

  test('builder keeps prebuilt 0.3.0 inputs and omits empty outputs', () => {
    const manifest = buildManifest(
      { name: 'feedback-extension', description: 'Feedback', version: '0.0.1' },
      { tenantId: TENANT_ID },
      '0.3.0'
    );
    const inputs = buildV030Inputs(
      ['application/vnd.ms-dragon.dsp.note+json', 'application/fhir.ehr-context+json', ADAPTIVE_CARD_CONTENT_TYPE],
      ['patient', 'current-encounter']
    );
    inputs.push({
      name: 'supplemental-context',
      description: 'Optional context',
      'content-type': 'application/fhir.ehr-context+json',
      include: ['conditions'],
      required: false
    });
    inputs[2].required = false;

    const tool = buildTool({
      toolName: 'feedback-tool',
      toolDescription: 'Handles card actions',
      endpoint: 'https://example.org/process',
      triggers: ['DataAvailable', 'ExplicitRequest'],
      inputTypes: [],
      inputs,
      outputs: []
    }, '0.3.0') as Record<string, any>;
    (manifest.tools as unknown[]).push(tool);

    expect(validateExtensionManifest(manifest).errors).toEqual([]);
    expect(tool.outputs).toBeUndefined();
    expect(tool.inputs.map((item: { name: string }) => item.name))
      .toEqual(['note', 'ehr-context', 'card-content', 'supplemental-context']);
    expect(tool.inputs[2].required).toBe(false);
  });
});

describe('physician migrate and versions commands', () => {
  let workingDir: string;
  const originalCwd = process.cwd();
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    workingDir = mkdtempSync(join(tmpdir(), 'dragon-copilot-migrate-'));
    process.chdir(workingDir);
    process.exitCode = 0;
    logSpy.mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workingDir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  async function run(...args: string[]): Promise<string> {
    const program = new Command();
    registerCommands(program);
    await program.parseAsync(['node', 'cli', 'physician', ...args]);
    return logSpy.mock.calls.flat().join('\n');
  }

  test('migrates a legacy manifest to a valid 0.3.0 manifest next to the original', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML, 'utf8');

    await run('migrate', manifestPath, '--non-interactive');

    expect(process.exitCode).toBe(0);
    expect(readFileSync(manifestPath, 'utf8')).toBe(LEGACY_MANIFEST_YAML);

    const migratedPath = join(workingDir, 'extension.migrated.yaml');
    const migrated = load(readFileSync(migratedPath, 'utf8')) as Record<string, any>;
    expect(validateExtensionManifest(migrated).errors).toEqual([]);
    expect(Object.keys(migrated)[0]).toBe('schemaVersion');
    expect(migrated.caption).toBe('Legacy Extension');

    const [noteTool, transcriptTool] = migrated.tools;
    expect(noteTool.caption).toBe('Note Tool');
    expect(noteTool.type).toBe('DragonAPI');
    expect(noteTool.triggers).toEqual(['ExplicitRequest']);
    expect(noteTool.timeout).toBe(60);
    expect(noteTool.trigger).toBeUndefined();
    expect(noteTool.inputs[0]).toEqual({
      name: 'note',
      description: 'Clinical note payload',
      'content-type': 'application/vnd.ms-dragon.dsp.note+json'
    });
    expect(noteTool.outputs[0]['content-type']).toBe('application/vnd.ms-dragon.dsp+json');
    expect(transcriptTool.triggers).toEqual(['DataAvailable']);
  });

  test('--dry-run prints the result without writing', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML, 'utf8');

    const logs = await run('migrate', manifestPath, '--non-interactive', '--dry-run');

    expect(process.exitCode).toBe(0);
    expect(logs).toContain('schemaVersion: 0.3.0');
    expect(existsSync(join(workingDir, 'extension.migrated.yaml'))).toBe(false);
  });

  test('--in-place overwrites the original file', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML, 'utf8');

    await run('migrate', manifestPath, '--non-interactive', '--in-place');

    const migrated = load(readFileSync(manifestPath, 'utf8')) as Record<string, any>;
    expect(migrated.schemaVersion).toBe('0.3.0');
  });

  test('--in-place keeps comments and aliases from the original file', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    const commented = LEGACY_MANIFEST_YAML
      .replace('name: legacy-extension', '# Owned by the notes team\nname: legacy-extension')
      .replace('    endpoint: https://example.org/process', '    endpoint: &ep https://example.org/process # prod endpoint')
      .replace('    endpoint: https://example.org/transcript', '    endpoint: *ep');
    writeFileSync(manifestPath, commented, 'utf8');

    await run('migrate', manifestPath, '--non-interactive', '--in-place');

    const content = readFileSync(manifestPath, 'utf8');
    expect(content.startsWith('# Owned by the notes team\nschemaVersion: 0.3.0')).toBe(true);
    expect(content).toContain('# prod endpoint');
    expect(content).toContain('endpoint: *ep');
    expect(validateExtensionManifest(load(content)).errors).toEqual([]);
  });

  test('refuses to migrate a source manifest that is not valid for its own version', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML.replace('trigger: AdaptiveCardAction', 'trigger: Manual'), 'utf8');

    const logs = await run('migrate', manifestPath, '--non-interactive');

    expect(process.exitCode).toBe(1);
    expect(logs).toContain('fix it before migrating');
    expect(existsSync(join(workingDir, 'extension.migrated.yaml'))).toBe(false);
  });

  test('does not guess a content-type for an unrecognized output data value', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML.replace('        data: DSP\n', '        data: free text\n'), 'utf8');

    const logs = await run('migrate', manifestPath, '--non-interactive');

    expect(process.exitCode).toBe(1);
    expect(logs).toContain('unknown data value "free text"');
    expect(existsSync(join(workingDir, 'extension.migrated.yaml'))).toBe(false);
  });

  test('does not write when the migrated manifest would be invalid', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML.replace('name: note-tool', 'name: 1-note-tool'), 'utf8');

    const logs = await run('migrate', manifestPath, '--non-interactive');

    expect(process.exitCode).toBe(1);
    expect(logs).toContain('must start with a lowercase letter');
    expect(existsSync(join(workingDir, 'extension.migrated.yaml'))).toBe(false);
  });

  test('reports nothing to do for a manifest already at the target version', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, JSON.stringify(buildV030Manifest()), 'utf8');

    const logs = await run('migrate', manifestPath, '--non-interactive');

    expect(process.exitCode).toBe(0);
    expect(logs).toContain('nothing to migrate');
  });

  test('rejects an unsupported target version', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML, 'utf8');
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = new Command();
    registerCommands(program);
    program.commands.forEach(command => command.commands.forEach(sub => sub.exitOverride()));

    await expect(
      program.parseAsync(['node', 'cli', 'physician', 'migrate', manifestPath, '--to', '9.9.9'])
    ).rejects.toThrow(/Unsupported schema version "9.9.9"/);
    expect(existsSync(join(workingDir, 'extension.migrated.yaml'))).toBe(false);
    stderrSpy.mockRestore();
  });

  test('validate reports the schema version of a 0.3.0 manifest', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, JSON.stringify(buildV030Manifest()), 'utf8');

    const logs = await run('validate', manifestPath);

    expect(process.exitCode).toBe(0);
    expect(logs).toContain('Validation passed! (schema 0.3.0)');
  });

  test('validate warns that a legacy manifest can be migrated', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, LEGACY_MANIFEST_YAML, 'utf8');

    const logs = await run('validate', manifestPath);

    expect(logs).toContain('original format (no schemaVersion)');
    expect(logs).toContain('physician migrate');
    expect(logs.toLowerCase()).toContain('validation passed');
  });

  test('generate --template defaults to the latest schema and honors --schema-version legacy', async () => {
    await run('generate', '--template', 'note-analysis', '--output', 'latest.yaml');
    await run('generate', '--template', 'note-analysis', '--output', 'legacy.yaml', '--schema-version', 'legacy');

    const latest = load(readFileSync(join(workingDir, 'latest.yaml'), 'utf8')) as Record<string, any>;
    const legacy = load(readFileSync(join(workingDir, 'legacy.yaml'), 'utf8')) as Record<string, any>;
    expect(latest.schemaVersion).toBe('0.3.0');
    expect(latest.tools.every((tool: Record<string, any>) => tool.timeout === 60)).toBe(true);
    expect(legacy.schemaVersion).toBeUndefined();
    expect(legacy.tools[0].timeout).toBeUndefined();
  });

  test('versions lists the latest and legacy versions', async () => {
    const logs = await run('versions');
    expect(logs).toContain('0.3.0');
    expect(logs).toContain('latest, default');
    expect(logs).toContain('legacy');
  });
});
