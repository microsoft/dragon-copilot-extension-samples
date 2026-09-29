import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync } = fs;
import path from 'path';
import chalk from 'chalk';
import type {
  InitOptions,
  DcrExtensionManifest
} from '../types.js';
import {
  MANIFEST_DEFAULTS,
  buildManifest,
  buildTool,
  renderManifestYaml
} from '../manifest/index.js';
import {
  promptExtensionDetails,
  promptToolDetails,
  promptAuthDetails
} from '../shared/prompts.js';

export async function initProject(options: InitOptions): Promise<void> {
    console.log(chalk.blue('?? Dragon Copilot Radiologists Extension Generator'));
  console.log(chalk.gray('Initializing a new radiologists extension project...\n'));

  // Step 1: Radiologists Extension Details
    console.log(chalk.blue('?? Step 1: Radiologists Extension Details'));
  console.log(chalk.gray('Let\'s start with basic information about your extension.\n'));

  const extensionDetails = await promptExtensionDetails({
    ...(options.name ? { name: options.name } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.version ? { version: options.version } : {})
  });

  // Step 2: Authentication Configuration
    console.log(chalk.blue('\n?? Step 2: Authentication Configuration'));
  console.log(chalk.gray('Configure Azure Entra ID authentication for your extension.\n'));

  const authDetails = await promptAuthDetails();

  // Step 3: Radiologists Tools
    console.log(chalk.blue('\n??? Step 3: Radiologists Tools'));
  console.log(chalk.gray('Tools define the AI-powered functionality your extension provides.'));
  console.log(chalk.gray('Each tool processes radiology data such as reports and patient info.\n'));

  const addTool = await confirm({
    message: 'Add an initial tool?',
    default: true
  });

  const manifest: DcrExtensionManifest = buildManifest({
    extension: extensionDetails,
    auth: authDetails,
    tools: []
  });

  if (addTool) {
    const toolDetails = await promptToolDetails(undefined, {
      allowMultipleInputs: true,
      defaults: {
        toolName: MANIFEST_DEFAULTS.toolName,
        toolDescription: MANIFEST_DEFAULTS.toolDescription,
        endpoint: MANIFEST_DEFAULTS.endpoint
      }
    });

    manifest.tools.push(buildTool({
      name: toolDetails.toolName,
      description: toolDetails.toolDescription,
      toolType: toolDetails.toolType,
      capability: toolDetails.capability,
      endpoint: toolDetails.endpoint,
      inputTypes: toolDetails.inputTypes,
      outputs: toolDetails.outputs,
      relevanceFilteringCriteria: toolDetails.relevanceFilteringCriteria
    }));
  }

  const outputPath = path.join(options.output || '.', 'extension.yaml');
  const yamlContent = renderManifestYaml(manifest);

  writeFileSync(outputPath, yamlContent);

    console.log(chalk.green('\n Radiologists extension project initialized successfully!'));
    console.log(chalk.gray(`Manifest created at: ${outputPath}`));

    console.log(chalk.blue('\n What\'s Next?'));

  if (addTool) {
      console.log(chalk.yellow('Development Steps:'));
    console.log(chalk.gray('   1. Update the endpoint URL with your actual API'));
    console.log(chalk.gray('   2. Customize inputs and outputs as needed'));
    console.log(chalk.gray('   3. Test your extension locally'));

    console.log(chalk.yellow('\n Deployment Steps:'));
    console.log(chalk.gray('   1. Package your extension: dragon-copilot radiologists package'));
    console.log(chalk.gray('   2. Deploy to the marketplace'));
  } else {
      console.log(chalk.yellow('Next Steps:'));
    console.log(chalk.gray('   1. Add tools to your extension: dragon-copilot radiologists generate --interactive'));
    console.log(chalk.gray('   2. Update the manifest with your API endpoints'));
    console.log(chalk.gray('   3. Test and package your extension'));
  }

    console.log(chalk.blue('\n Resources:'));
  console.log(chalk.gray('   � Validate your extension: dragon-copilot radiologists validate'));
  console.log(chalk.gray('   � Add more tools: dragon-copilot radiologists generate --interactive'));
  console.log(chalk.gray('   � Package for deployment: dragon-copilot radiologists package'));
}
