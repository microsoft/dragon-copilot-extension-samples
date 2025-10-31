import { describe, expect, test } from '@jest/globals';
import { Command } from 'commander';
import { registerCommands } from '../commands/index.js';
import { validateFieldValue } from '../shared/schema-validator.js';

describe('registerCommands', () => {
  test('registers extension and partner command groups', () => {
    const program = new Command();

    registerCommands(program);

    const commandNames = program.commands.map(command => command.name());
    expect(commandNames).toEqual(expect.arrayContaining(['extension', 'partner']));
  });

  test('registers expected extension subcommands', () => {
    const program = new Command();
    registerCommands(program);

    const extension = program.commands.find(command => command.name() === 'extension');
    expect(extension).toBeDefined();
    const subCommands = extension?.commands.map(command => command.name()) ?? [];
    expect(subCommands).toEqual(
      expect.arrayContaining(['init', 'generate', 'validate', 'package']),
    );
  });

  test('registers expected partner subcommands', () => {
    const program = new Command();
    registerCommands(program);

    const partner = program.commands.find(command => command.name() === 'partner');
    expect(partner).toBeDefined();
    const subCommands = partner?.commands.map(command => command.name()) ?? [];
    expect(subCommands).toEqual(
      expect.arrayContaining(['init', 'generate', 'validate', 'package']),
    );
  });
});

describe('schema field validation', () => {
  test('validates partner tool name using definitions path', () => {
    expect(
      validateFieldValue('valid-tool', 'definitions.PartnerTool.properties.name', 'partner-manifest'),
    ).toBe(true);

    const result = validateFieldValue(
      'Invalid Tool',
      'definitions.PartnerTool.properties.name',
      'partner-manifest',
    );

    expect(typeof result).toBe('string');
    if (typeof result === 'string') {
      expect(result.toLowerCase()).toContain('pattern');
    }
  });
});
