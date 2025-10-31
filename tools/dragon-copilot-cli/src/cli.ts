#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerCommands } from './commands/index.js';

const VERSION = '1.0.0';

async function main(): Promise<void> {
	const program = new Command();

	program
		.name('dragon-copilot')
		.description('Unified CLI for Dragon Copilot extensions and integrations')
		.version(VERSION);

	registerCommands(program);

	await program.parseAsync();
}

main().catch(error => {
	console.error(chalk.red('Unhandled CLI error:'), error);
	process.exitCode = 1;
});

process.on('unhandledRejection', (reason, promise) => {
	console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
	process.exit(1);
});

process.on('uncaughtException', error => {
	console.error(chalk.red('Uncaught Exception:'), error);
	process.exit(1);
});
