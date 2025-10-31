import fs from 'fs-extra';
const { readFileSync, writeFileSync, existsSync } = fs;
import yaml from 'js-yaml';
const { load, dump } = yaml;
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import type { GenerateOptions, DragonExtensionManifest, DragonTool } from '../types.js';
import { getTemplate } from '../templates/index.js';
import { promptToolDetails, promptPublisherDetails, promptAuthDetails, getInputDescription } from '../shared/prompts.js';

export async function generateManifest(options: GenerateOptions): Promise<void> {
  console.log(chalk.blue('🐉 Generating Dragon Copilot Manifest'));

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

  // Check for publisher.json and offer to create/update it
  const publisherPath = 'publisher.json';
  const publisherExists = existsSync(publisherPath);

  if (!publisherExists) {
    const createPublisher = await confirm({
      message: 'No publisher.json found. Create publisher configuration?',
      default: true
    });

    if (createPublisher) {
      console.log(chalk.blue('\n📋 Publisher Configuration'));
      const publisherConfig = await promptPublisherDetails();
      writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
      console.log(chalk.green('✅ Publisher configuration created!'));
    }
  } else {
    const updatePublisher = await confirm({
      message: 'Update existing publisher.json?',
      default: false
    });

    if (updatePublisher) {
      console.log(chalk.blue('\n📋 Updating Publisher Configuration'));
      try {
        const existingPublisher = JSON.parse(readFileSync(publisherPath, 'utf8'));
        const publisherConfig = await promptPublisherDetails(existingPublisher);
        writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
        console.log(chalk.green('✅ Publisher configuration updated!'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not parse existing publisher.json, creating new one'));
        const publisherConfig = await promptPublisherDetails();
        writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
      }
    }
  }

  // Use shared prompt logic
  const answers = await promptToolDetails(existingManifest);

  const newTool: DragonTool = {
    name: answers.toolName,
    description: answers.toolDescription,
    endpoint: answers.endpoint,
    inputs: answers.inputTypes.map((dataType: string, index: number) => ({
      name: dataType === 'DSP/Note' ? 'note' :
            dataType === 'DSP/IterativeTranscript' ? 'iterative-transcript' :
            dataType === 'DSP/IterativeAudio' ? 'iterative-audio' :
            dataType === 'DSP/Transcript' ? 'transcript' :
            `input-${index + 1}`,
      description: getInputDescription(dataType),
      data: dataType
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
      manifestVersion: 3,
      name: 'my-extension',
      description: 'A Dragon Copilot extension',
      version: '0.0.1',
      auth: {
        tenantId: authDetails.tenantId
      },
      tools: [newTool],
      automationScripts: [],
      eventTriggers: [],
      dependencies: []
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

    // Offer to create publisher.json for template-based generation
    const publisherPath = 'publisher.json';
    const publisherExists = existsSync(publisherPath);

    if (!publisherExists) {
      const createPublisher = await confirm({
        message: 'Create publisher configuration file (publisher.json)?',
        default: true
      });

      if (createPublisher) {
        console.log(chalk.blue('\n📋 Publisher Configuration'));
        const publisherConfig = await promptPublisherDetails();
        writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
        console.log(chalk.green('✅ Publisher configuration created!'));
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`❌ Error generating from template: ${error.message}`));
    } else {
      console.log(chalk.red('❌ Unknown error occurred while generating from template'));
    }
  }
}
