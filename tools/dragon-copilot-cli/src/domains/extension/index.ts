import type { Command } from 'commander';
import type { PackageOptions, InitOptions, GenerateOptions } from './types.js';

export * from './types.js';
export * from './shared/prompts.js';

export async function initProject(options: InitOptions): Promise<void> {
	const module = await import('./commands/init.js');
	return module.initProject(options);
}

export async function generateManifest(options: GenerateOptions): Promise<void> {
	const module = await import('./commands/generate.js');
	return module.generateManifest(options);
}

export async function validateManifest(file: string): Promise<void> {
	const module = await import('./commands/validate.js');
	return module.validateManifest(file);
}

export async function packageExtension(options: PackageOptions): Promise<void> {
	const module = await import('./commands/package.js');
	return module.packageExtension(options);
}

export function registerExtensionCommands(program: Command): void {
	const extension = program
		.command('extension')
		.description('Commands for Dragon Copilot extension projects');

	extension
		.command('init')
		.description('Initialize a new extension project')
		.option('-n, --name <name>', 'Extension name')
		.option('-d, --description <description>', 'Extension description')
		.option('-v, --version <version>', 'Extension version', '0.0.1')
		.option('-o, --output <path>', 'Output directory', '.')
		.action(async (options: { name?: string; description?: string; version: string; output: string }) => {
			const normalizedOptions: InitOptions = { output: options.output };

			if (options.name !== undefined) {
				normalizedOptions.name = options.name;
			}

			if (options.description !== undefined) {
				normalizedOptions.description = options.description;
			}

			if (options.version !== undefined) {
				normalizedOptions.version = options.version;
			}

			await initProject(normalizedOptions);
		});

	extension
		.command('generate')
		.description('Generate or update an extension manifest')
		.option('-t, --template <template>', 'Template to use (note-analysis, speech-analysis, custom)')
		.option('-o, --output <path>', 'Output file path', 'extension.yaml')
		.option('-i, --interactive', 'Interactive mode')
		.action(async (options: { template?: string; output: string; interactive?: boolean }) => {
			const normalizedOptions: GenerateOptions = { output: options.output };

			if (options.template !== undefined) {
				normalizedOptions.template = options.template;
			}

			if (options.interactive) {
				normalizedOptions.interactive = options.interactive;
			}

			await generateManifest(normalizedOptions);
		});

	extension
		.command('validate')
		.description('Validate an extension manifest file')
		.argument('<file>', 'Manifest file to validate')
		.action(async (file: string) => {
			await validateManifest(file);
		});

	extension
		.command('package')
		.description('Package an extension into a distributable bundle')
		.option('-m, --manifest <path>', 'Manifest file path', 'extension.yaml')
		.option('-o, --output <path>', 'Output ZIP file path')
		.option('-i, --include <patterns...>', 'Additional files to include')
		.option('--silent', 'Suppress console output')
		.action(async (options: { manifest?: string; output?: string; include?: string[]; silent?: boolean }) => {
				const normalizedOptions: PackageOptions = {};

				if (options.manifest !== undefined) {
					normalizedOptions.manifest = options.manifest;
				}

				if (options.output !== undefined) {
					normalizedOptions.output = options.output;
				}

				if (options.include !== undefined) {
					normalizedOptions.include = options.include;
				}

				if (options.silent !== undefined) {
					normalizedOptions.silent = options.silent;
				}

				await packageExtension(normalizedOptions);
		});
}
