#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'module';
import { registerCommands } from './commands/index.js';
import { reportCliError } from './common/index.js';

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
		.version(VERSION)
		.option('--debug', 'Show stack traces for errors (same as DEBUG=1)')
		.option('--verbose', 'Alias for --debug');

	registerCommands(program);

	await program.parseAsync();
}

main().catch(error => {
	reportCliError(error);
	process.exitCode = 1;
});

process.on('unhandledRejection', reason => {
	reportCliError(reason);
	process.exit(1);
});

process.on('uncaughtException', error => {
	reportCliError(error);
	process.exit(1);
});
