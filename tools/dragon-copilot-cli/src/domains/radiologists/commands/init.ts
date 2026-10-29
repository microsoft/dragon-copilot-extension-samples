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
    console.log(chalk.blue('🐉 Dragon Copilot Radiologists Extension Generator'));
  console.log(chalk.gray('Initializing a new radiologists extension project...\n'));

  // Step 1: Radiologists Extension Details
    console.log(chalk.blue('📝 Step 1: Radiologists Extension Details'));
  console.log(chalk.gray('Let\'s start with basic information about your extension.\n'));

  const extensionDetails = await promptExtensionDetails({
    ...(options.name ? { name: options.name } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.version ? { version: options.version } : {})
  });

  // Step 2: Authentication Configuration
    console.log(chalk.blue('\n🔐 Step 2: Authentication Configuration'));
  console.log(chalk.gray('Configure Microsoft Entra authentication for your extension.\n'));

  const authDetails = await promptAuthDetails();

  // Step 3: Radiologists Tools
    console.log(chalk.blue('\n🛠️  Step 3: Radiologists Tools'));
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

  let addAnotherTool = addTool;

  while (addAnotherTool) {
    // Passing the in-progress manifest makes the name prompt reject duplicates.
    const toolDetails = await promptToolDetails(manifest.tools.length > 0 ? manifest : undefined, {
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

    addAnotherTool = await confirm({
      message: 'Add another tool?',
      default: false
    });
  }

  const outputPath = path.join(options.output || '.', 'extension.yaml');
  const yamlContent = renderManifestYaml(manifest);

  writeFileSync(outputPath, yamlContent);

    console.log(chalk.green('\n✅ Radiologists extension project initialized successfully!'));
    console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));

    console.log(chalk.blue('\n🎯 What\'s Next?'));

  if (addTool) {
      console.log(chalk.yellow('🚀 Development Steps:'));
    // Each tool type needs different setup, so a manifest that mixes them gets both sets of steps.
    const developmentSteps: string[] = [];
    if (manifest.tools.some(t => t.toolType === 'contractBased')) {
      developmentSteps.push('Update the endpoint URL with your actual API');
      developmentSteps.push('Customize inputs and outputs as needed');
    }
    if (manifest.tools.some(t => t.toolType === 'partnerInitiated')) {
      developmentSteps.push('Set up a Partner app registration to get access tokens (see radiologists/partner-initiated/authentication.md)');
      developmentSteps.push('Submit draft reports to Dragon Copilot (see radiologists/partner-initiated/README.md)');
    }
    developmentSteps.push('Test your extension locally');
    developmentSteps.forEach((step, index) => console.log(chalk.gray(`   ${index + 1}. ${step}`)));

    console.log(chalk.yellow('\n📦 Deployment Steps:'));
    console.log(chalk.gray('   1. Package your extension: dragon-copilot radiologists package'));
    console.log(chalk.gray('   2. Deploy to the marketplace'));
  } else {
      console.log(chalk.yellow('🔧 Next Steps:'));
    console.log(chalk.gray('   1. Add tools to your extension: dragon-copilot radiologists generate --interactive'));
    console.log(chalk.gray('   2. Update the manifest with your API endpoints'));
    console.log(chalk.gray('   3. Test and package your extension'));
  }

    console.log(chalk.blue('\n📚 Resources:'));
  console.log(chalk.gray('   • Validate your extension: dragon-copilot radiologists validate'));
  console.log(chalk.gray('   • Add more tools: dragon-copilot radiologists generate --interactive'));
  console.log(chalk.gray('   • Package for deployment: dragon-copilot radiologists package'));
}
