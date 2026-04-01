import fs from 'fs-extra';
const { readFileSync, writeFileSync } = fs;
import yaml from 'js-yaml';
const { load, dump } = yaml;
import chalk from 'chalk';
import type { GenerateOptions, DragonExtensionManifest, DragonTool } from '../types.js';
import { getTemplate } from '../templates/index.js';
import { promptToolDetails, promptAuthDetails, getInputDescription, getInputName } from '../shared/prompts.js';

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

  // Check if manifest already exists
  let existingManifest: DragonExtensionManifest | null = null;
  try {
    const existing = readFileSync(options.output || 'extension.yaml', 'utf8');
    existingManifest = load(existing) as DragonExtensionManifest;
    console.log(chalk.yellow('📄 Found existing manifest, will add to it'));
  } catch {
    // File doesn't exist, create new
  }

  // Use shared prompt logic
  const answers = await promptToolDetails(existingManifest);

  const newTool: DragonTool = {
    name: answers.toolName,
    description: answers.toolDescription,
    endpoint: answers.endpoint,
    inputs: answers.inputTypes.map((contentType: string, index: number) => ({
      name: getInputName(contentType, index),
      description: getInputDescription(contentType),
      'content-type': contentType
    })),
    outputs: answers.outputs
  };

  let manifest: DragonExtensionManifest;
  if (existingManifest) {
    manifest = existingManifest;
    manifest.tools.push(newTool);
  } else {
    // For new manifests, collect auth details
    console.log(chalk.blue('\n🔐 Authentication Configuration'));
    console.log(chalk.gray('New manifest requires authentication configuration.\n'));
    const authDetails = await promptAuthDetails();

    manifest = {
      name: 'my-extension',
      description: 'A Dragon Copilot extension',
      version: '0.0.1',
      auth: {
        tenantId: authDetails.tenantId
      },
      tools: [newTool]
    };
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
    const template = getTemplate(options.template);
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
