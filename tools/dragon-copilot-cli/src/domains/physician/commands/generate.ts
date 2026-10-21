import fs from 'fs-extra';
const { readFileSync, writeFileSync } = fs;
import { load, dump } from 'js-yaml';
import chalk from 'chalk';
import type { GenerateOptions, DragonExtensionManifest } from '../types.js';
import { getTemplate } from '../templates/index.js';
import { promptToolDetails, promptAuthDetails, humanizeName } from '../shared/prompts.js';
import { buildManifest, buildTool } from '../shared/manifest-builder.js';
import {
  getManifestSchemaVersion,
  isSupportedSchemaVersion,
  resolveRequestedSchemaVersion
} from '../shared/schema-validator.js';

export async function generateManifest(options: GenerateOptions): Promise<void> {
  console.log(chalk.blue('🐉 Generating Dragon Copilot Physician Workflow Manifest'));

  if (options.interactive) {
    await generateInteractive(options);
  } else if (options.template) {
    await generateFromTemplate(options);
  } else {
    console.log(chalk.red('❌ Please specify either --template or --interactive'));
    process.exit(1);
  }
}

async function generateInteractive(options: GenerateOptions): Promise<void> {
  console.log(chalk.gray('Interactive manifest generation...\n'));

  let existingManifest: DragonExtensionManifest | null = null;
  try {
    const existing = readFileSync(options.output || 'extension.yaml', 'utf8');
    existingManifest = load(existing) as DragonExtensionManifest;
    console.log(chalk.yellow('📄 Found existing manifest, will add to it'));
  } catch {
    // File doesn't exist, create new
  }

  // An existing manifest keeps its own format; new tools must match it.
  let schemaVersion: string;
  if (existingManifest) {
    schemaVersion = getManifestSchemaVersion(existingManifest);
    if (!isSupportedSchemaVersion(schemaVersion)) {
      throw new Error(`Existing manifest uses unsupported schemaVersion "${schemaVersion}"`);
    }
    if (options.schemaVersion && options.schemaVersion !== schemaVersion) {
      console.log(chalk.yellow(`⚠️  Ignoring --schema-version ${options.schemaVersion}; the existing manifest uses ${schemaVersion}. Run 'dragon-copilot physician migrate' to change versions.`));
    }
  } else {
    schemaVersion = resolveRequestedSchemaVersion(options.schemaVersion);
  }

  const answers = await promptToolDetails(existingManifest, { schemaVersion });
  const newTool = buildTool(answers, schemaVersion);

  let manifest: DragonExtensionManifest;
  if (existingManifest) {
    manifest = existingManifest;
    (manifest.tools as unknown[]).push(newTool);
  } else {
    console.log(chalk.blue('\n🔐 Authentication Configuration'));
    console.log(chalk.gray('New manifest requires authentication configuration.\n'));
    const authDetails = await promptAuthDetails();

    manifest = buildManifest(
      {
        name: 'my-extension',
        caption: humanizeName('my-extension'),
        description: 'A Dragon Copilot extension',
        version: '0.0.1'
      },
      { tenantId: authDetails.tenantId },
      schemaVersion
    );
    (manifest.tools as unknown[]).push(newTool);
  }

  const yamlContent = dump(manifest, { lineWidth: -1 });
  writeFileSync(options.output || 'extension.yaml', yamlContent);

  console.log(chalk.green('\n✅ Tool added to manifest successfully!'));
  console.log(chalk.gray(`📁 Manifest saved to: ${options.output || 'extension.yaml'}`));
}
async function generateFromTemplate(options: GenerateOptions): Promise<void> {
  if (!options.template) {
    console.log(chalk.red('❌ Template name is required'));
    return;
  }

  try {
    const template = getTemplate(options.template, resolveRequestedSchemaVersion(options.schemaVersion));
    const yamlContent = dump(template, { lineWidth: -1 });
    writeFileSync(options.output || 'extension.yaml', yamlContent);

    console.log(chalk.green(`✅ Manifest generated from template: ${options.template}`));
    console.log(chalk.gray(`📁 Manifest saved to: ${options.output || 'extension.yaml'}`));

  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`❌ Error generating from template: ${error.message}`));
    } else {
      console.log(chalk.red('❌ Unknown error occurred while generating from template'));
    }
  }
}
