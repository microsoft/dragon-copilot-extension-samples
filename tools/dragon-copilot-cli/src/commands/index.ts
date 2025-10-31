import type { Command } from 'commander';
import { registerExtensionCommands } from '../domains/extension/index.js';
import { registerPartnerCommands } from '../domains/partner/index.js';

export function registerCommands(program: Command): void {
	registerExtensionCommands(program);
	registerPartnerCommands(program);
}
