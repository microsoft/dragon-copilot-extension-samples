import { describe, expect, test, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Command } from 'commander';
import { load } from 'js-yaml';

// Scripted answers for @inquirer/prompts: each entry answers the first prompt whose message matches.
type ScriptedAnswer = [RegExp, string | boolean];
let scriptedAnswers: ScriptedAnswer[] = [];
const answer = (config: { message: string }) => {
  const index = scriptedAnswers.findIndex(([pattern]) => pattern.test(config.message));
  if (index === -1) {
    throw new Error(`Unexpected prompt: ${config.message}`);
  }
  const [, value] = scriptedAnswers.splice(index, 1)[0]!;
  return Promise.resolve(value);
};
jest.unstable_mockModule('@inquirer/prompts', () => ({
  input: jest.fn(answer),
  select: jest.fn(answer),
  confirm: jest.fn(answer),
  checkbox: jest.fn(answer),
}));

const { registerCommands } = await import('../commands/index.js');

/** Lists entry names from a ZIP central directory (no extra dependency needed). */
function listZipEntries(zipPath: string): string[] {
  const buffer = readFileSync(zipPath);
  const names: string[] = [];
  for (let offset = 0; offset + 46 <= buffer.length; offset++) {
    if (buffer.readUInt32LE(offset) === 0x02014b50) {
      const nameLength = buffer.readUInt16LE(offset + 28);
      names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
      offset += 45 + nameLength;
    }
  }
  return names.sort();
}

const EXTENSION_MANIFEST = [
  'name: integration-extension',
  'description: Extension manifest used in integration tests',
  'version: 0.0.1',
  'auth:',
  '  tenantId: 00000000-0000-0000-0000-000000000001',
  'tools:',
  '  - name: note-tool',
  '    description: Processes clinical notes',
  '    endpoint: https://example.org/process',
  '    inputs:',
  '      - name: note',
  '        description: Clinical note payload',
  '        data: DSP/Note',
  '    outputs:',
  '      - name: result',
  '        description: Inference output payload',
  '        data: DSP',
].join('\n');

const RADIOLOGISTS_EXTENSION_MANIFEST = [
  'name: integrationRadiologistsExtension',
  'description: Radiologists extension manifest used in integration tests',
  'version: 0.0.1',
  'radiologistsExtensibilityApiVersion: 1.0.0',
  'auth:',
  '  tenantId: 00000000-0000-0000-0000-000000000001',
  'tools:',
  '  - name: qualityChecker',
  '    toolType: contractBased',
  '    capability: qualityCheck',
  '    description: Checks the quality of a radiology report',
  '    endpoint: https://example.org/quality-check',
  '    inputs:',
  '      - name: report',
  '        description: Radiology report from Dragon Copilot',
  '        content-type: application/vnd.ms-dragon.rad.report+json',
  '        schemaVersion: "1.0"',
  '      - name: patientInformation',
  '        description: Patient demographic information',
  '        content-type: application/vnd.ms-dragon.rad.patient-information+json',
  '        schemaVersion: "1.0"',
  '    outputs:',
  '      - name: qualityCheckResult',
  '        description: Quality check findings and score',
  '        content-type: application/vnd.ms-dragon.rad.quality-check-result+json',
  '        schemaVersion: "1.0"',
].join('\n');

const PARTNER_MANIFEST = [
  'name: integration-partner',
  'description: Connector Manifest used in integration tests',
  'version: 0.0.1',
  'publisher-name: Sample Partner, Inc.',
  'partner-id: 11111111-2222-3333-4444-555555555555',
  'clinical-application-name: Integration Test EHR',
  'server-authentication:',
  '  - issuer: https://login.contoso.com/oauth2/default',
  '    identity-claim: azp',
  '    identity-value:',
  '      - 11111111-2222-3333-4444-555555555555',
  'instance:',
  '  client-authentication:',
  '    allow-multiple-issuers: no',
  '    issuer:',
  '      access-token-issuer:',
  '        type: url',
  '        description: Issuer claim for partner issued access tokens.',
  '        required: yes',
  '        default-value: https://login.contoso.com/oauth2/default',
  '  web-launch-token:',
  '    use-client-authentication: yes',
  '  context-retrieval:',
  '    instance:',
  '      - name: base-url',
  '        type: url',
  '        description: base url need for API calls.  These are typically FHIR calls.',
  '        required: yes',
].join('\n');

describe('CLI integration paths', () => {
  const tmpRoot = join(tmpdir(), 'dragon-copilot-tests-');
  let workingDir: string;
  const originalCwd = process.cwd();
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeAll(() => {
    // Ensure process exit code is clean before tests run.
    process.exitCode = 0;
  });

  beforeEach(() => {
    workingDir = mkdtempSync(tmpRoot);
    process.chdir(workingDir);
    process.exitCode = 0;
    logSpy.mockClear();
    warnSpy.mockClear();
    errorSpy.mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workingDir, { recursive: true, force: true });
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('physician validate succeeds for a valid manifest', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, EXTENSION_MANIFEST, 'utf8');

    const program = new Command();
    registerCommands(program);

    await program.parseAsync(['node', 'cli', 'physician', 'validate', manifestPath]);

    const combinedLogs = logSpy.mock.calls.flat().join(' ');
    expect(combinedLogs.toLowerCase()).toContain('validation passed');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  test('partner validate succeeds for a valid manifest', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, PARTNER_MANIFEST, 'utf8');

    const program = new Command();
    registerCommands(program);

    await program.parseAsync(['node', 'cli', 'connector', 'validate', manifestPath]);

    const combinedLogs = logSpy.mock.calls.flat().join(' ');
    expect(combinedLogs.toLowerCase()).toContain('integration manifest is valid');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  test('radiologists validate succeeds for a valid manifest with qualityCheck capability', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, RADIOLOGISTS_EXTENSION_MANIFEST, 'utf8');

    const program = new Command();
    registerCommands(program);

    await program.parseAsync(['node', 'cli', 'radiologists', 'validate', manifestPath]);

    const combinedLogs = logSpy.mock.calls.flat().join(' ');
    expect(combinedLogs.toLowerCase()).toMatch(/valid|passed/);
    expect(process.exitCode).toBe(0);
  });

  test('connector package succeeds with only a manifest (no publisher.json or assets)', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, PARTNER_MANIFEST, 'utf8');

    const program = new Command();
    registerCommands(program);

    await program.parseAsync(['node', 'cli', 'connector', 'package', '--silent']);

    const outputZip = join(workingDir, 'integration-partner-0.0.1.zip');
    expect(existsSync(outputZip)).toBe(true);
    expect(existsSync(join(workingDir, 'publisher.json'))).toBe(false);
    expect(existsSync(join(workingDir, 'assets'))).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  describe('physician schema 0.4.0-preview.2 (conversational tools)', () => {
    const V040 = '0.4.0-preview.2';
    const TENANT_ID = '11111111-2222-3333-4444-555555555555';
    let exitSpy: ReturnType<typeof jest.spyOn>;

    const run = async (...args: string[]) => {
      const program = new Command();
      registerCommands(program);
      await program.parseAsync(['node', 'cli', 'physician', ...args]);
    };
    const readManifest = (file = 'extension.yaml') => load(readFileSync(join(workingDir, file), 'utf8')) as any;
    const logs = () => logSpy.mock.calls.flat().join(' ');
    const envelopeAnswers = (name: string): ScriptedAnswer[] => [
      [/^Extension name/, name],
      [/^Extension caption/, 'Integration Extension'],
      [/^Extension description/, 'Integration test'],
      [/^Version/, '1.0.0'],
      [/^Azure Entra ID Tenant ID/, TENANT_ID],
    ];

    beforeEach(() => {
      scriptedAnswers = [];
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
      }) as never);
    });

    afterEach(() => {
      exitSpy.mockRestore();
      expect(scriptedAnswers).toEqual([]);
    });

    test('init --type MCP creates a valid manifest from prompted answers', async () => {
      scriptedAnswers = [
        ...envelopeAnswers('integration-extension'),
        [/^Tool name/, 'orders'],
        [/^Tool caption/, 'Orders'],
        [/^Server description \(shared context for all this server's tools/, 'Order extraction from the current encounter.'],
        [/^MCP endpoint/, 'https://mcp.contoso.com/mcp'],
        [/^MCP tool names to expose/, 'extract_orders'],
        [/^Set a custom timeout/, true],
        [/^Timeout in seconds/, '20'],
      ];

      await run('init', '--schema-version', V040, '--type', 'mcp');

      const manifest = readManifest();
      expect(manifest).toMatchObject({ schemaVersion: V040, name: 'integration-extension', auth: { tenantId: TENANT_ID } });
      expect(manifest.tools[0]).toMatchObject({
        name: 'orders', type: 'MCP', triggers: ['IntentDriven'], endpoint: 'https://mcp.contoso.com/mcp', expose: ['extract_orders'], timeout: 20,
      });
      await run('validate', 'extension.yaml');
      expect(logs()).toContain('Validation passed');
      expect(logs()).toContain('orders [MCP] https://mcp.contoso.com/mcp');
    });

    test('init --type CopilotStudio --output creates a missing directory', async () => {
      scriptedAnswers = [
        ...envelopeAnswers('nested-extension'),
        [/^Tool name/, 'agent'],
        [/^Tool caption/, 'Agent'],
        [/^When should Dragon Copilot use this tool/, 'Use for scheduling.'],
        [/^Copilot Studio environment ID/, TENANT_ID],
        [/^Agent schema name/, 'cr123_scheduling'],
        [/^Set a custom timeout/, false],
      ];

      await run('init', '--schema-version', V040, '--type', 'CopilotStudio', '--output', join('new', 'dir'));

      expect(readManifest(join('new', 'dir', 'extension.yaml')).tools[0]).toMatchObject({ type: 'CopilotStudio', agentIdentifier: 'cr123_scheduling' });
    });

    test('init --type rejects conversational types under the default 0.3.0 schema', async () => {
      await expect(run('init', '--type', 'MCP')).rejects.toThrow(/0\.4\.0-preview\.2/);
      expect(existsSync(join(workingDir, 'extension.yaml'))).toBe(false);
    });

    test('init refuses to overwrite an existing manifest', async () => {
      writeFileSync(join(workingDir, 'extension.yaml'), 'name: existing\n', 'utf8');
      await expect(run('init', '--schema-version', V040, '--type', 'MCP')).rejects.toThrow(/already exists/);
      expect(readFileSync(join(workingDir, 'extension.yaml'), 'utf8')).toBe('name: existing\n');
    });

    test.each([
      ['mcp', 'MCP'],
      ['openapi', 'OpenAPI'],
      ['copilot-studio', 'CopilotStudio'],
    ])('generate --template %s writes a valid %s manifest', async (template, type) => {
      const output = join('sub', template, 'extension.yaml');
      await run('generate', '--schema-version', V040, '--template', template, '--output', output);

      const manifest = readManifest(output);
      expect(manifest.schemaVersion).toBe(V040);
      expect(manifest.tools.map((tool: { type: string }) => tool.type)).toEqual([type]);
      await run('validate', output);
      expect(logs()).toContain('Validation passed');
      expect(logs()).toContain('all-zero placeholder');
    });

    test('generate --template rejects conversational templates under 0.3.0', async () => {
      await expect(run('generate', '--template', 'mcp')).rejects.toThrow(/Template 'mcp' not found/);
    });

    test('generate --interactive creates a new 0.4.0 manifest with a prompted tool type', async () => {
      scriptedAnswers = [
        [/^Tool type/, 'OpenAPI'],
        [/^Tool name/, 'drug-check'],
        [/^Tool caption/, 'Drug Check'],
        [/^Server description \(short notes shared by all this service/, 'Drug interaction checks.'],
        [/^OpenAPI document URL/, 'https://api.contoso.com/openapi/v1.json'],
        [/^OpenAPI operationIds to expose/, 'checkInteractions'],
        [/^Set a custom timeout/, false],
        [/^Azure Entra ID Tenant ID/, TENANT_ID],
      ];

      await run('generate', '--schema-version', V040, '--interactive');

      const manifest = readManifest();
      expect(manifest).toMatchObject({ schemaVersion: V040, auth: { tenantId: TENANT_ID } });
      expect(manifest.tools[0]).toMatchObject({ name: 'drug-check', type: 'OpenAPI', expose: ['checkInteractions'] });
      expect(logs()).not.toContain('all-zero placeholder');
    });

    test('generate --interactive appends a tool to an existing 0.4.0 manifest', async () => {
      await run('generate', '--schema-version', V040, '--template', 'mcp');
      scriptedAnswers = [
        [/^Tool type/, 'CopilotStudio'],
        [/^Tool name/, 'scheduler'],
        [/^Tool caption/, 'Scheduler'],
        [/^When should Dragon Copilot use this tool/, 'Use to schedule follow-ups.'],
        [/^Copilot Studio environment ID/, TENANT_ID],
        [/^Agent schema name/, 'cr123_scheduler'],
        [/^Set a custom timeout/, false],
      ];

      await run('generate', '--interactive');

      expect(readManifest().tools.map((tool: { name: string }) => tool.name)).toEqual(['order-extraction', 'scheduler']);
      expect(logs()).toContain('all-zero placeholder');
    });

    test('validate exits with code 1 for an invalid manifest', async () => {
      writeFileSync(join(workingDir, 'extension.yaml'), `schemaVersion: ${V040}\nname: Bad Name\ntools: []\n`, 'utf8');
      await expect(run('validate', 'extension.yaml')).rejects.toThrow('process.exit(1)');
      expect(logs()).toContain('validation failed');
    });

    test('validate exits with code 1 when the manifest is missing', async () => {
      await expect(run('validate', 'missing.yaml')).rejects.toThrow('process.exit(1)');
      expect(logs()).toContain('Manifest file not found');
    });

    test('package zips the manifest and included files', async () => {
      await run('generate', '--schema-version', V040, '--template', 'mcp');
      writeFileSync(join(workingDir, 'README.txt'), 'readme', 'utf8');

      await run('package', '--include', 'README.txt', '--silent');

      const zipPath = join(workingDir, 'my-order-extraction-extension-0.0.1.zip');
      expect(existsSync(zipPath)).toBe(true);
      expect(listZipEntries(zipPath)).toEqual(['README.txt', 'extension.yaml']);
    });

    test('package rejects when the manifest is missing', async () => {
      await expect(run('package', '--silent')).rejects.toThrow(/manifest not found/);
    });

    test('package refuses to overwrite an input file', async () => {
      await run('generate', '--schema-version', V040, '--template', 'mcp');
      mkdirSync(join(workingDir, 'out'));
      await expect(run('package', '--output', 'extension.yaml', '--silent')).rejects.toThrow(/would overwrite/);
      expect(readManifest().tools).toHaveLength(1);
    });

    test('versions lists 0.4.0-preview.2 as preview while 0.3.0 stays the default', async () => {
      await run('versions');
      const output = logs().replace(/\u001b\[[0-9;]*m/g, '');
      expect(output).toMatch(/0\.3\.0 \[latest, default\]/);
      expect(output).toMatch(/0\.4\.0-preview\.2 \[preview\]/);
    });

    test.each([
      ['0.3.0', [
        'schemaVersion: "0.3.0"',
        'name: migrate-extension',
        'caption: Migrate Extension',
        'description: Migration test',
        'version: 0.0.1',
        'auth:',
        '  tenantId: 00000000-0000-0000-0000-000000000001',
        'tools:',
        '  - name: note-tool',
        '    caption: Note Tool',
        '    description: Processes clinical notes',
        '    type: DragonAPI',
        '    endpoint: https://example.org/process',
        '    triggers: [DataAvailable]',
        '    inputs:',
        '      - name: note',
        '        description: Clinical note payload',
        '        content-type: application/vnd.ms-dragon.dsp.note+json',
        '    outputs:',
        '      - name: result',
        '        description: Inference output payload',
        '        content-type: application/vnd.ms-dragon.dsp+json',
      ].join('\n')],
      ['legacy', EXTENSION_MANIFEST],
    ])('migrate %s -> 0.4.0-preview.2 produces a valid manifest', async (_from, source) => {
      writeFileSync(join(workingDir, 'extension.yaml'), source, 'utf8');

      await run('migrate', 'extension.yaml', '--to', V040, '--non-interactive');

      expect(process.exitCode).toBe(0);
      const migrated = readManifest('extension.migrated.yaml');
      expect(migrated.schemaVersion).toBe(V040);
      expect(migrated.tools[0].type).toBe('DragonAPI');
      await run('validate', 'extension.migrated.yaml');
      expect(logs()).toContain(`Validation passed! (schema ${V040})`);
    });
  });
});
