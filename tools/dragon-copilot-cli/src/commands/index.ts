import type { Command } from 'commander';
import { registerExtensionCommands } from '../domains/extension/index.js';
import { registerConnectorCommands } from '../domains/connector/index.js';

export function registerCommands(program: Command): void {
	registerExtensionCommands(program);
	registerConnectorCommands(program);
}
