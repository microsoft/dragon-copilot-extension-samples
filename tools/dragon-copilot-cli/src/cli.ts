#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { registerCommands } from './commands/index.js';

const VERSION = '1.0.0';

async function showInteractiveMenu(): Promise<void> {
	console.log(chalk.cyan('\n🐉 Dragon Copilot CLI v' + VERSION + '\n'));
	
	const choice = await select({
		message: 'What would you like to do?',
		choices: [
			{ name: 'Initialize a new Extension project', value: 'extension-init' },
			{ name: 'Initialize a new Connector project', value: 'connector-init' },
			{ name: 'Package an Extension', value: 'extension-package' },
			{ name: 'Package a Connector', value: 'connector-package' },
			{ name: 'Validate a manifest file', value: 'validate' },
			{ name: 'Show help', value: 'help' },
			{ name: 'Exit', value: 'exit' },
		],
	});

	// Map choices to command arguments
	const commandMap: Record<string, string[]> = {
		'extension-init': ['extension', 'init'],
		'connector-init': ['connector', 'init'],
		'extension-package': ['extension', 'package'],
		'connector-package': ['connector', 'package'],
		'validate': ['extension', 'validate', '--help'],
		'help': ['--help'],
		'exit': [],
	};

	const args = commandMap[choice];
	if (!args || args.length === 0) {
		console.log(chalk.green('\nGoodbye! 👋\n'));
		return;
	}

	// Re-run with selected command
	process.argv = [process.argv[0]!, process.argv[1]!, ...args];
}

async function main(): Promise<void> {
	const program = new Command();

	program
		.name('dragon-copilot')
		.description('Unified CLI for Dragon Copilot extensions and integrations')
		.version(VERSION);

	registerCommands(program);

	// Check if running without arguments (interactive mode)
	const hasArgs = process.argv.length > 2;
	
	if (!hasArgs) {
		// Check if running in an interactive terminal
		if (process.stdin.isTTY) {
			await showInteractiveMenu();
			// If exit was chosen, don't parse
			if (process.argv.length <= 2) {
				return;
			}
		}
	}

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
