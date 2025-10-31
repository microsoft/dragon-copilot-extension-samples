import { describe, expect, test, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Command } from 'commander';
import { registerCommands } from '../commands/index.js';

const EXTENSION_MANIFEST = [
  'manifestVersion: 3',
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
  'automationScripts:',
  '  - name: note-automation',
  '    description: Handles post-note processing',
  '    entryPoint: scripts/note/index.js',
  '    runtime: nodejs18',
  '    timeoutSeconds: 90',
  'eventTriggers:',
  '  - name: note-created',
  '    description: Runs whenever a note is created',
  '    eventType: note.created',
  '    scriptName: note-automation',
  'dependencies:',
  '  - name: terminology-service',
  '    version: 1.0.0',
  '    type: service',
].join('\n');

const PARTNER_MANIFEST = [
  'name: integration-partner',
  'description: Partner manifest used in integration tests',
  'version: 0.0.1',
  'partner-id: contoso.integration.test',
  'server-authentication:',
  '  - issuer: https://login.contoso.com/oauth2/default',
  '    identity_claim: azp',
  '    identity_value:',
  '      - 11111111-2222-3333-4444-555555555555',
  'note-sections:',
  '  assessment:',
  '    - assessment',
  '    - plan',
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
  '      - name: base_url',
  '        type: url',
  '        description: base url needed for API calls.  These are typically FHIR calls.',
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

  test('extension validate succeeds for a valid manifest', async () => {
    const manifestPath = join(workingDir, 'extension.yaml');
    writeFileSync(manifestPath, EXTENSION_MANIFEST, 'utf8');

    const program = new Command();
    registerCommands(program);

    await program.parseAsync(['node', 'cli', 'extension', 'validate', manifestPath]);

    const combinedLogs = logSpy.mock.calls.flat().join(' ');
    expect(combinedLogs.toLowerCase()).toContain('validation passed');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  test('partner validate succeeds for a valid manifest', async () => {
    const manifestPath = join(workingDir, 'integration.yaml');
    writeFileSync(manifestPath, PARTNER_MANIFEST, 'utf8');

    const program = new Command();
    registerCommands(program);

    await program.parseAsync(['node', 'cli', 'partner', 'validate', manifestPath]);

    const combinedLogs = logSpy.mock.calls.flat().join(' ');
    expect(combinedLogs.toLowerCase()).toContain('integration manifest is valid');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });
});
