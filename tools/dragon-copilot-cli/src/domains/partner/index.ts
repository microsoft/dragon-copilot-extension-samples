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

export async function runValidateCommand(file?: string): Promise<void> {
	const module = await import('./commands/validate.js');
	return module.runValidateCommand(file);
}

export async function packageIntegration(options: PackageOptions): Promise<void> {
	const module = await import('./commands/package.js');
	return module.packageIntegration(options);
}

export function registerPartnerCommands(program: Command): void {
	const partner = program
		.command('partner')
		.description('Commands for Dragon Copilot partner integrations');

	partner
		.command('init')
		.description('Initialize a new partner integration project')
		.option('-n, --name <name>', 'Integration name')
		.option('-d, --description <description>', 'Integration description')
		.option('-v, --version <version>', 'Integration version', '0.0.1')
		.option('-o, --output <path>', 'Output directory', '.')
		.action(async (options: { name?: string; description?: string; version: string; output: string }) => {
			const normalized: InitOptions = { output: options.output };

			if (options.name !== undefined) {
				normalized.name = options.name;
			}
			if (options.description !== undefined) {
				normalized.description = options.description;
			}
			if (options.version !== undefined) {
				normalized.version = options.version;
			}

			await initProject(normalized);
		});

	partner
		.command('generate')
		.description('Generate or update an integration manifest')
		.option('-t, --template <template>', 'Template to use (ehr-integration, api-connector, data-sync, custom)')
		.option('-o, --output <path>', 'Output file path', 'integration.yaml')
		.option('-i, --interactive', 'Interactive mode')
		.action(async (options: { template?: string; output: string; interactive?: boolean }) => {
			const normalized: GenerateOptions = { output: options.output };

			if (options.template !== undefined) {
				normalized.template = options.template;
			}
			if (options.interactive) {
				normalized.interactive = options.interactive;
			}

			await generateManifest(normalized);
		});

	partner
		.command('validate')
		.description('Validate a partner integration manifest file')
		.argument('[file]', 'Manifest file to validate')
		.action(async (file?: string) => {
			await runValidateCommand(file);
		});

	partner
		.command('package')
		.description('Package a partner integration into a distributable bundle')
		.option('-m, --manifest <path>', 'Manifest file path', 'integration.yaml')
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

			await packageIntegration(normalizedOptions);
		});
}
