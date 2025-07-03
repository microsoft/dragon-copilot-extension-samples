import inquirer from 'inquirer';
import fs from 'fs-extra';
const { readFileSync, writeFileSync } = fs;
import yaml from 'js-yaml';
const { load, dump } = yaml;
import chalk from 'chalk';
import { GenerateOptions, DragonExtensionManifest, DragonTool } from '../types.js';
import { getTemplate } from '../templates/index.js';

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
    const existing = readFileSync(options.output || 'manifest.yaml', 'utf8');
    existingManifest = load(existing) as DragonExtensionManifest;
    console.log(chalk.yellow('📄 Found existing manifest, will add to it'));
  } catch {
    // File doesn't exist, create new
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'toolName',
      message: 'Tool name:',
      validate: (input: string) => {
        if (!input.trim()) return 'Tool name is required';
        if (!/^[a-z0-9-]+$/.test(input)) return 'Tool name must contain only lowercase letters, numbers, and hyphens';
        if (existingManifest?.tools.find(t => t.name === input)) {
          return 'Tool with this name already exists';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'toolDescription',
      message: 'Tool description:'
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'API endpoint:',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'checkbox',
      name: 'inputTypes',
      message: 'Select input data types:',
      choices: [
        { name: 'Clinical Note (DSP/Note)', value: 'DSP/Note' },
        { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'DSP/IterativeTranscript' },
        { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'DSP/IterativeAudio' },
        { name: 'Transcript (DSP/Transcript)', value: 'DSP/Transcript' },
      ],
      validate: (choices: string[]) => {
        if (choices.length === 0) return 'Please select at least one input type';
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'includeAdaptiveCard',
      message: 'Include Adaptive Card output?',
      default: true
    }
  ]);

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
    outputs: [
      {
        name: 'processed-data',
        description: 'Processed data response',
        data: 'DSP'
      }
    ]
  };

  if (answers.includeAdaptiveCard) {
    newTool.outputs.push({
      name: 'adaptive-card',
      description: 'Adaptive Card response',
      data: 'DSP'
    });
  }

  let manifest: DragonExtensionManifest;
  if (existingManifest) {
    manifest = existingManifest;
    manifest.tools.push(newTool);
  } else {
    manifest = {
      name: 'my-extension',
      description: 'A Dragon Copilot extension',
      version: '0.0.1',
      tools: [newTool]
    };
  }

  const yamlContent = dump(manifest, { lineWidth: -1 });
  writeFileSync(options.output || 'manifest.yaml', yamlContent);

  console.log(chalk.green('\n✅ Tool added to manifest successfully!'));
  console.log(chalk.gray(`📁 Manifest saved to: ${options.output || 'manifest.yaml'}`));
}

async function generateFromTemplate(options: GenerateOptions): Promise<void> {
  if (!options.template) {
    console.log(chalk.red('❌ Template name is required'));
    return;
  }

  try {
    const template = getTemplate(options.template);
    const yamlContent = dump(template, { lineWidth: -1 });
    writeFileSync(options.output || 'manifest.yaml', yamlContent);

    console.log(chalk.green(`✅ Manifest generated from template: ${options.template}`));
    console.log(chalk.gray(`📁 Manifest saved to: ${options.output || 'manifest.yaml'}`));
  } catch (error) {
    console.log(chalk.red(`❌ Error generating from template: ${error}`));
  }
}

function getInputDescription(dataType: string): string {
  switch (dataType) {
    case 'DSP/Note':
      return 'Clinical Note generated by Dragon Copilot';
    case 'DSP/IterativeTranscript':
      return 'Iterative transcript from Dragon Copilot';
    case 'DSP/IterativeAudio':
      return 'Iterative audio from Dragon Copilot';
    case 'DSP/Transcript':
      return 'Complete transcript from Dragon Copilot';
    default:
      return 'Data from Dragon Copilot';
  }
}
