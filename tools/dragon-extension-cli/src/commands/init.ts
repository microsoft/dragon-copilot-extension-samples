import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync } = fs;
import yaml from 'js-yaml';
const { dump } = yaml;
import path from 'path';
import chalk from 'chalk';
import { InitOptions, DragonExtensionManifest } from '../types.js';
import { promptExtensionDetails, promptToolDetails, getInputDescription } from '../shared/prompts.js';

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🐉 Dragon Copilot Extension Generator'));
  console.log(chalk.gray('Initializing a new extension project...\n'));

  // Use shared prompt for extension details
  const extensionDetails = await promptExtensionDetails({
    name: options.name,
    description: options.description,
    version: options.version
  });

  const addTool = await confirm({
    message: 'Add an initial tool?',
    default: true
  });

  const manifest: DragonExtensionManifest = {
    name: extensionDetails.name,
    description: extensionDetails.description,
    version: extensionDetails.version,
    tools: []
  };

  if (addTool) {
    // Use shared prompt for tool details (single input for init)
    const toolDetails = await promptToolDetails(undefined, {
      includeAdaptiveCardPrompt: false, // Skip adaptive card prompt for init
      allowMultipleInputs: true, // Allow multiple inputs for flexibility
      defaults: {
        toolName: 'my-tool',
        toolDescription: 'Processes clinical data',
        endpoint: 'https://api.example.com/tool-route'
      }
    });

    manifest.tools.push({
      name: toolDetails.toolName,
      description: toolDetails.toolDescription,
      endpoint: toolDetails.endpoint,
      inputs: toolDetails.inputTypes.map((dataType, index) => ({
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

  if (addTool) {
    console.log(chalk.yellow('\n💡 Next steps:'));
    console.log(chalk.gray('1. Update the endpoint URL with your actual API'));
    console.log(chalk.gray('2. Customize inputs and outputs as needed'));
  }
}
