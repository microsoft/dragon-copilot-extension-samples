import type { Command } from 'commander';
import type { PackageOptions, InitOptions, GenerateOptions } from './types.js';

export * from './types.js';

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

export async function packageExtension(options: PackageOptions): Promise<string> {
  const module = await import('./commands/package.js');
  return module.packageExtension(options);
}

export function registerConversationalCommands(program: Command): void {
  const conversational = program
    .command('conversational')
    .description('Commands for Dragon Copilot conversational extensions (MCP, OpenAPI, Copilot Studio)');

  conversational
    .command('init')
    .description('Create a new conversational extension manifest (extension.yaml)')
    .option('-n, --name <name>', 'Extension name')
    .option('-d, --description <description>', 'Extension description')
    .option('-v, --version <version>', 'Extension version')
    .option('-t, --type <type>', 'Integration type of the first tool (MCP, OpenAPI, CopilotStudio)')
    .option('-o, --output <path>', 'Output directory', '.')
    .action(async (options: { name?: string; description?: string; version?: string; type?: string; output: string }) => {
      const normalized: InitOptions = { output: options.output };
      if (options.name !== undefined) normalized.name = options.name;
      if (options.description !== undefined) normalized.description = options.description;
      if (options.version !== undefined) normalized.version = options.version;
      if (options.type !== undefined) normalized.type = options.type;
      await initProject(normalized);
    });

  conversational
    .command('generate')
    .description('Add a conversational tool to a manifest from a template or interactively')
    .option('-t, --template <template>', 'Template to use (mcp, openapi, copilot-studio)')
    .option('-o, --output <path>', 'Manifest file path', 'extension.yaml')
    .option('-i, --interactive', 'Interactive mode')
    .action(async (options: { template?: string; output: string; interactive?: boolean }) => {
      const normalized: GenerateOptions = { output: options.output };
      if (options.template !== undefined) normalized.template = options.template;
      if (options.interactive) normalized.interactive = true;
      await generateManifest(normalized);
    });

  conversational
    .command('validate')
    .description('Validate a conversational extension manifest against schema 0.4.0-preview.2')
    .argument('<file>', 'Manifest file to validate')
    .action(async (file: string) => {
      await validateManifest(file);
    });

  conversational
    .command('package')
    .description('Validate and package a conversational extension for upload')
    .option('-m, --manifest <path>', 'Manifest file path', 'extension.yaml')
    .option('-o, --output <path>', 'Output ZIP file path')
    .option('-i, --include <patterns...>', 'Additional files to include')
    .option('--silent', 'Suppress console output')
    .action(async (options: { manifest?: string; output?: string; include?: string[]; silent?: boolean }) => {
      const normalized: PackageOptions = {};
      if (options.manifest !== undefined) normalized.manifest = options.manifest;
      if (options.output !== undefined) normalized.output = options.output;
      if (options.include !== undefined) normalized.include = options.include;
      if (options.silent !== undefined) normalized.silent = options.silent;
      await packageExtension(normalized);
    });
}
