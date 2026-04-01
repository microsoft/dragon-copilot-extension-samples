import { describe, expect, test } from '@jest/globals';
import { Command } from 'commander';
import { registerCommands } from '../commands/index.js';
import { validateFieldValue } from '../shared/schema-validator.js';

describe('registerCommands', () => {
  test('registers physician and partner command groups', () => {
    const program = new Command();

    registerCommands(program);

    const commandNames = program.commands.map(command => command.name());
    expect(commandNames).toEqual(expect.arrayContaining(['physician', 'connector']));
  });

  test('registers expected physician subcommands', () => {
    const program = new Command();
    registerCommands(program);

    const physician = program.commands.find(command => command.name() === 'physician');
    expect(physician).toBeDefined();
    const subCommands = physician?.commands.map(command => command.name()) ?? [];
    expect(subCommands).toEqual(
      expect.arrayContaining(['init', 'generate', 'validate', 'package']),
    );
  });

  test('registers expected partner subcommands', () => {
    const program = new Command();
    registerCommands(program);

    const partner = program.commands.find(command => command.name() === 'connector');
    expect(partner).toBeDefined();
    const subCommands = partner?.commands.map(command => command.name()) ?? [];
    expect(subCommands).toEqual(
      expect.arrayContaining(['init', 'generate', 'validate', 'package']),
    );
  });
});

describe('schema field validation', () => {
  test('validates connector name using properties path', () => {
    expect(
      validateFieldValue('valid-connector', 'properties.name', 'connector-manifest'),
    ).toBe(true);

    const result = validateFieldValue(
      'Invalid Connector',
      'properties.name',
      'connector-manifest',
    );

    expect(typeof result).toBe('string');
    if (typeof result === 'string') {
      expect(result.toLowerCase()).toContain('pattern');
    }
  });
});

