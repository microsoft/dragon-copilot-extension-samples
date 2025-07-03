import inquirer from 'inquirer';
import fs from 'fs-extra';
const { writeFileSync } = fs;
import yaml from 'js-yaml';
const { dump } = yaml;
import path from 'path';
import chalk from 'chalk';
import { InitOptions, DragonExtensionManifest } from '../types.js';

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🐉 Dragon Copilot Extension Generator'));
  console.log(chalk.gray('Initializing a new extension project...\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Extension name:',
      default: options.name || 'my-dragon-extension',
      validate: (input: string) => {
        if (!input.trim()) return 'Extension name is required';
        if (!/^[a-z0-9-]+$/.test(input)) return 'Extension name must contain only lowercase letters, numbers, and hyphens';
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Extension description:',
      default: options.description || 'A Dragon Copilot extension'
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: options.version || '0.0.1',
      validate: (input: string) => {
        if (!/^\d+\.\d+\.\d+$/.test(input)) return 'Version must be in format x.y.z';
        return true;
      }
    },
    {
      type: 'confirm',
      name: 'addTool',
      message: 'Add an initial tool?',
      default: true
    }
  ]);

  const manifest: DragonExtensionManifest = {
    name: answers.name,
    description: answers.description,
    version: answers.version,
    tools: []
  };

  if (answers.addTool) {
    const toolAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'toolName',
        message: 'Tool name:',
        default: 'my-tool',
        validate: (input: string) => {
          if (!input.trim()) return 'Tool name is required';
          if (!/^[a-z0-9-]+$/.test(input)) return 'Tool name must contain only lowercase letters, numbers, and hyphens';
          return true;
        }
      },
      {
        type: 'input',
        name: 'toolDescription',
        message: 'Tool description:',
        default: 'Processes clinical data'
      },
      {
        type: 'input',
        name: 'endpoint',
        message: 'API endpoint:',
        default: 'https://api.example.com/tool-route',
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
        type: 'list',
        name: 'inputType',
        message: 'Primary input data type:',
        choices: [
          { name: 'Clinical Note', value: 'DSP/Note' },
          { name: 'Iterative Transcript', value: 'DSP/IterativeTranscript' },
          { name: 'Iterative Audio', value: 'DSP/IterativeAudio' },
          { name: 'Transcript', value: 'DSP/Transcript' },
        ]
      }
    ]);

    manifest.tools.push({
      name: toolAnswers.toolName,
      description: toolAnswers.toolDescription,
      endpoint: toolAnswers.endpoint,
      inputs: [
        {
          name: 'input-data',
          description: 'Primary input data',
          data: toolAnswers.inputType
        }
      ],
      outputs: [
        {
          name: 'processed-data',
          description: 'Processed data response',
          data: 'DSP'
        },
        {
          name: 'adaptive-card',
          description: 'Adaptive Card response',
          data: 'DSP'
        }
      ]
    });
  }

  const outputPath = path.join(options.output || '.', 'manifest.yaml');
  const yamlContent = dump(manifest, { lineWidth: -1 });

  writeFileSync(outputPath, yamlContent);

  console.log(chalk.green('\n✅ Extension project initialized successfully!'));
  console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));

  if (answers.addTool) {
    console.log(chalk.yellow('\n💡 Next steps:'));
    console.log(chalk.gray('1. Update the endpoint URL with your actual API'));
    console.log(chalk.gray('2. Customize inputs and outputs as needed'));
  }
}
