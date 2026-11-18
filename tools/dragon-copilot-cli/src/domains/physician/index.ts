import { InvalidArgumentError, type Command } from 'commander';
import type { PackageOptions, InitOptions, GenerateOptions, MigrateOptions } from './types.js';
import { LATEST_SCHEMA_VERSION, resolveRequestedSchemaVersion } from './shared/schema-validator.js';

export * from './types.js';
export * from './shared/prompts.js';

const SCHEMA_VERSION_OPTION_DESCRIPTION =
	`Manifest schema version (default: ${LATEST_SCHEMA_VERSION}; use "legacy" for the original format). See "physician versions".`;

function parseSchemaVersion(value: string): string {
	try {
		return resolveRequestedSchemaVersion(value);
	} catch (error) {
		throw new InvalidArgumentError(error instanceof Error ? error.message : String(error));
	}
}

export async function migrateManifest(file: string, options: MigrateOptions): Promise<void> {
	const module = await import('./commands/migrate.js');
	return module.migrateManifest(file, options);
}

export async function listSchemaVersions(): Promise<void> {
	const module = await import('./commands/versions.js');
	return module.listSchemaVersions();
}

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
		.command('physician')
		.description('Commands for Dragon Copilot physician workflow projects');

	extension
		.command('init')
		.description('Initialize a new physician workflow project')
		.option('-n, --name <name>', 'Extension name')
		.option('-d, --description <description>', 'Extension description')
		.option('-v, --version <version>', 'Extension version', '0.0.1')
		.option('-o, --output <path>', 'Output directory', '.')
		.option('--schema-version <version>', SCHEMA_VERSION_OPTION_DESCRIPTION, parseSchemaVersion)
		.action(async (options: { name?: string; description?: string; version: string; output: string; schemaVersion?: string }) => {
			const normalizedOptions: InitOptions = { output: options.output };

			if (options.schemaVersion !== undefined) {
				normalizedOptions.schemaVersion = options.schemaVersion;
			}

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
		.description('Generate or update a physician workflow manifest')
		.option('-t, --template <template>', 'Template to use (note-analysis, speech-analysis, custom)')
		.option('-o, --output <path>', 'Output file path', 'extension.yaml')
		.option('-i, --interactive', 'Interactive mode')
		.option('--schema-version <version>', `${SCHEMA_VERSION_OPTION_DESCRIPTION} Ignored when adding to an existing manifest.`, parseSchemaVersion)
		.action(async (options: { template?: string; output: string; interactive?: boolean; schemaVersion?: string }) => {
			const normalizedOptions: GenerateOptions = { output: options.output };

			if (options.schemaVersion !== undefined) {
				normalizedOptions.schemaVersion = options.schemaVersion;
			}

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
		.description('Validate a physician workflow manifest file')
		.argument('<file>', 'Manifest file to validate')
		.action(async (file: string) => {
			await validateManifest(file);
		});

	extension
		.command('migrate')
		.description('Upgrade a physician workflow manifest to a newer schema version')
		.argument('<file>', 'Manifest file to migrate')
		.option('--to <version>', `Target schema version (default: ${LATEST_SCHEMA_VERSION})`, parseSchemaVersion)
		.option('--in-place', 'Overwrite the input file instead of writing <name>.migrated.yaml')
		.option('--dry-run', 'Print the migrated manifest and changes without writing anything')
		.option('--non-interactive', 'Use inferred values (captions, triggers) instead of prompting')
		.action(async (file: string, options: { to?: string; inPlace?: boolean; dryRun?: boolean; nonInteractive?: boolean }) => {
			const normalizedOptions: MigrateOptions = {
				inPlace: options.inPlace === true,
				dryRun: options.dryRun === true,
				nonInteractive: options.nonInteractive === true
			};

			if (options.to !== undefined) {
				normalizedOptions.to = options.to;
			}

			await migrateManifest(file, normalizedOptions);
		});

	extension
		.command('versions')
		.description('List supported physician manifest schema versions')
		.action(async () => {
			await listSchemaVersions();
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
