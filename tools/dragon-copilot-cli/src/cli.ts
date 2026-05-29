#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import { registerCommands } from './commands/index.js';

// Injected at bundle time by esbuild define; falls back to package.json for dev (npm link).
declare const __CLI_VERSION__: string | undefined;
const VERSION: string =
	typeof __CLI_VERSION__ !== 'undefined'
		? __CLI_VERSION__
		: createRequire(import.meta.url)('../package.json').version;

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
