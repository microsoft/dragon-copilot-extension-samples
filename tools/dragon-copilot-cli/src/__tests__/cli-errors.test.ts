import { describe, expect, test, beforeEach, afterAll, jest } from '@jest/globals';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Command } from 'commander';
import { registerCommands } from '../commands/index.js';
import { isDebugEnabled, reportCliError } from '../common/errors.js';

const stripAnsi = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, '');

describe('CLI error reporting', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const output = () => stripAnsi(errorSpy.mock.calls.flat().join('\n'));

  beforeEach(() => errorSpy.mockClear());
  afterAll(() => errorSpy.mockRestore());

  /** Runs a command that throws an expected error and returns the thrown error. */
  async function captureCommandError(): Promise<unknown> {
    const workingDir = mkdtempSync(join(tmpdir(), 'dragon-copilot-errors-'));
    const originalCwd = process.cwd();
    process.chdir(workingDir);
    try {
      const program = new Command();
      registerCommands(program);
      await program.parseAsync(['node', 'cli', 'physician', 'package', '--silent']);
      throw new Error('expected the command to fail');
    } catch (error) {
      return error;
    } finally {
      process.chdir(originalCwd);
      rmSync(workingDir, { recursive: true, force: true });
    }
  }

  test('prints a clean message without a stack trace by default', async () => {
    reportCliError(await captureCommandError(), false);

    expect(output()).toBe('Error: Extension manifest not found: extension.yaml');
    expect(output()).not.toMatch(/\bat\s.+\(/);
    expect(output()).not.toContain('Unhandled');
  });

  test('prints the stack trace in debug mode', async () => {
    reportCliError(await captureCommandError(), true);

    const lines = output().split('\n');
    expect(lines[0]).toBe('Error: Extension manifest not found: extension.yaml');
    expect(output().match(/Extension manifest not found/g)).toHaveLength(1);
    expect(output()).toMatch(/\n\s+at\s.*packageExtension/);
  });

  test('reports non-Error values as their string form', () => {
    reportCliError('plain failure', true);
    expect(output()).toBe('Error: plain failure');
  });

  test.each([
    [['node', 'cli', 'physician', 'validate', 'x.yaml'], {}, false],
    [['node', 'cli', 'physician', 'validate', 'x.yaml', '--debug'], {}, true],
    [['node', 'cli', '--verbose', 'physician', 'validate', 'x.yaml'], {}, true],
    [['node', 'cli'], { DEBUG: '1' }, true],
    [['node', 'cli'], { DEBUG: 'dragon-copilot' }, true],
    [['node', 'cli'], { DEBUG: '0' }, false],
    [['node', 'cli'], { DEBUG: 'false' }, false],
  ])('isDebugEnabled(%j, %j) is %s', (argv, env, expected) => {
    expect(isDebugEnabled(argv, env as NodeJS.ProcessEnv)).toBe(expected);
  });
});
