import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync } = fs;
import yaml from 'js-yaml';
const { dump } = yaml;
import path from 'path';
import chalk from 'chalk';
import type {
  InitOptions,
  DragonExtensionManifest
} from '../types.js';
import {
  promptExtensionDetails,
  promptToolDetails,
  promptAuthDetails,
  getInputDescription,
  getInputName
} from '../shared/prompts.js';

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🐉 Dragon Copilot Physician Workflow Generator'));
  console.log(chalk.gray('Initializing a new physician workflow project...\n'));

  // Step 1: Physician Workflow Details
  console.log(chalk.blue('📝 Step 1: Physician Workflow Details'));
  console.log(chalk.gray('Let\'s start with basic information about your extension.\n'));

  const extensionDetails = await promptExtensionDetails({
    ...(options.name ? { name: options.name } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.version ? { version: options.version } : {})
  });

  // Step 2: Authentication Configuration
  console.log(chalk.blue('\n🔐 Step 2: Authentication Configuration'));
  console.log(chalk.gray('Configure Azure Entra ID authentication for your extension.\n'));

  const authDetails = await promptAuthDetails();

  // Step 3: Physician Workflow Tools
  console.log(chalk.blue('\n🛠️  Step 3: Physician Workflow Tools'));
  console.log(chalk.gray('Tools define the AI-powered functionality your extension provides.'));
  console.log(chalk.gray('Each tool processes specific types of clinical data and returns results.\n'));

  const addTool = await confirm({
    message: 'Add an initial tool?',
    default: true
  });

  const manifest: DragonExtensionManifest = {
    name: extensionDetails.name,
    description: extensionDetails.description,
    version: extensionDetails.version,
    auth: {
      tenantId: authDetails.tenantId
    },
    tools: []
  };

  if (addTool) {
    // Use shared prompt for tool details (single input for init)
    const toolDetails = await promptToolDetails(undefined, {
      allowMultipleInputs: true, // Allow multiple inputs for flexibility
      defaults: {
        toolName: 'my-tool',
        toolDescription: 'Processes clinical data',
        endpoint: 'https://api.example.com/tool-route/v1/process'
      }
    });

    manifest.tools.push({
      name: toolDetails.toolName,
      description: toolDetails.toolDescription,
      endpoint: toolDetails.endpoint,
      inputs: toolDetails.inputTypes.map((contentType, index) => ({
        name: getInputName(contentType, index),
        description: getInputDescription(contentType),
        'content-type': contentType
      })),
      outputs: toolDetails.outputs
    });
  }

  const outputPath = path.join(options.output || '.', 'extension.yaml');
  const yamlContent = dump(manifest, { lineWidth: -1 });

  writeFileSync(outputPath, yamlContent);

  console.log(chalk.green('\n✅ Physician workflow project initialized successfully!'));
  console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));

  // Enhanced next steps with better organization
  console.log(chalk.blue('\n🎯 What\'s Next?'));

  if (addTool) {
    console.log(chalk.yellow('� Development Steps:'));
    console.log(chalk.gray('   1. Update the endpoint URL with your actual API'));
    console.log(chalk.gray('   2. Customize inputs and outputs as needed'));
    console.log(chalk.gray('   3. Test your extension locally'));

    console.log(chalk.yellow('\n📦 Deployment Steps:'));
    console.log(chalk.gray('   1. Package your extension: dragon-copilot physician package'));
    console.log(chalk.gray('   2. Deploy to the marketplace'));
  } else {
    console.log(chalk.yellow('🔧 Next Steps:'));
    console.log(chalk.gray('   1. Add tools to your extension: dragon-copilot physician generate --interactive'));
    console.log(chalk.gray('   2. Update the manifest with your API endpoints'));
    console.log(chalk.gray('   3. Test and package your extension'));
  }

  console.log(chalk.blue('\n📚 Resources:'));
  console.log(chalk.gray('   • Validate your extension: dragon-copilot physician validate'));
  console.log(chalk.gray('   • Add more tools: dragon-copilot physician generate --interactive'));
  console.log(chalk.gray('   • Package for deployment: dragon-copilot physician package'));
}
