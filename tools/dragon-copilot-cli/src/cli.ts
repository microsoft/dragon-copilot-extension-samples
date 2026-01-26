#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import { registerCommands } from './commands/index.js';

const VERSION = '1.0.0';

// Custom error class for intercepted exits
class InteractiveExitError extends Error {
	constructor(public code: number) {
		super(`Process exit intercepted with code ${code}`);
		this.name = 'InteractiveExitError';
	}
}

async function showInteractiveMenu(): Promise<string[]> {
	console.log(chalk.cyan('\n🐉 Dragon Copilot CLI v' + VERSION + '\n'));
	
	const choice = await select({
		message: 'What would you like to do?',
		choices: [
			{ name: 'Initialize a new Extension project', value: 'extension-init' },
			{ name: 'Initialize a new Connector project', value: 'connector-init' },
			{ name: 'Package an Extension', value: 'extension-package' },
			{ name: 'Package a Connector', value: 'connector-package' },
			{ name: 'Validate an Extension manifest', value: 'extension-validate' },
			{ name: 'Validate a Connector manifest', value: 'connector-validate' },
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
		'extension-validate': ['extension', 'validate'],
		'connector-validate': ['connector', 'validate'],
		'help': ['--help'],
		'exit': [],
	};

	return commandMap[choice] ?? [];
}

async function runInteractiveLoop(): Promise<void> {
	let continueLoop = true;
	
	// Store the original process.exit
	const originalExit = process.exit;
	
	while (continueLoop) {
		const args = await showInteractiveMenu();
		
		if (args.length === 0) {
			console.log(chalk.green('\nGoodbye! 👋\n'));
			break;
		}

		// Create a fresh program instance for each command
		const program = new Command();
		program
			.name('dragon-copilot')
			.description('Unified CLI for Dragon Copilot extensions and integrations')
			.version(VERSION)
			.exitOverride(); // Prevent Commander from calling process.exit()

		registerCommands(program);

		// Intercept process.exit during command execution
		process.exit = ((code?: number) => {
			throw new InteractiveExitError(code ?? 0);
		}) as never;

		try {
			// Reset exit code before each command
			process.exitCode = 0;
			
			// Parse with the selected command
			await program.parseAsync(['node', 'dragon-copilot', ...args]);
		} catch (error: unknown) {
			if (error instanceof InteractiveExitError) {
				// Command called process.exit() - this is expected behavior for errors
				if (error.code !== 0) {
					// Error exit - already logged by the command
				}
			} else if (error instanceof Error && error.message !== 'commander.helpDisplayed') {
				// Commander throws on --help, which is expected
				console.error(chalk.red('\nCommand failed:'), error.message);
			}
		} finally {
			// Restore original process.exit
			process.exit = originalExit;
		}

		console.log(chalk.dim('\n' + '─'.repeat(50) + '\n'));
		
		// Ask if user wants to continue
		try {
			continueLoop = await confirm({
				message: 'Would you like to perform another action?',
				default: true,
			});
		} catch {
			// User pressed Ctrl+C
			console.log(chalk.green('\nGoodbye! 👋\n'));
			break;
		}
	}
}

async function main(): Promise<void> {
	// Check if running without arguments (interactive mode)
	const hasArgs = process.argv.length > 2;
	
	if (!hasArgs && process.stdin.isTTY) {
		// Interactive mode - run the loop
		await runInteractiveLoop();
		return;
	}

	// Command-line mode - run single command
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
