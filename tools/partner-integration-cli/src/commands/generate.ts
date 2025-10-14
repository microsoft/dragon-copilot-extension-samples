import fs from 'fs-extra';
const { readFileSync, writeFileSync, existsSync } = fs;
import yaml from 'js-yaml';
const { load, dump } = yaml;
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { GenerateOptions, PartnerIntegrationManifest, PartnerTool } from '../types.js';
import { getTemplate } from '../templates/index.js';
import { promptToolDetails, promptPublisherDetails, getInputDescription } from '../shared/prompts.js';

export async function generateManifest(options: GenerateOptions): Promise<void> {
  console.log(chalk.blue('🤝 Generating Partner Integration Manifest'));

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
  let existingManifest: PartnerIntegrationManifest | null = null;
  const manifestPath = options.output || 'integration.yaml';
  
  try {
    const existing = readFileSync(manifestPath, 'utf8');
    existingManifest = load(existing) as PartnerIntegrationManifest;
    console.log(chalk.yellow('📄 Found existing manifest, will add to it'));
  } catch {
    // File doesn't exist, create new
    console.log(chalk.gray('📄 Creating new integration manifest'));
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
        // Note: We'd need to update promptPublisherDetails to accept existing config
        const publisherConfig = await promptPublisherDetails();
        writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
        console.log(chalk.green('✅ Publisher configuration updated!'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not parse existing publisher.json, creating new one'));
        const publisherConfig = await promptPublisherDetails();
        writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
      }
    }
  }

  // Prompt for tool details
  console.log(chalk.blue('\n🛠️  Tool Configuration'));
  const answers = await promptToolDetails(existingManifest);

  const newTool: PartnerTool = {
    name: answers.toolName,
    description: answers.toolDescription,
    endpoint: answers.endpoint,
    inputs: answers.inputTypes.map((dataType: string, index: number) => ({
      name: dataType === 'DSP/Note' ? 'note' :
            dataType === 'DSP/IterativeTranscript' ? 'iterative-transcript' :
            dataType === 'DSP/IterativeAudio' ? 'iterative-audio' :
            dataType === 'DSP/Transcript' ? 'transcript' :
            dataType === 'DSP/Patient' ? 'patient' :
            dataType === 'DSP/Encounter' ? 'encounter' :
            dataType === 'EHR/PatientRecord' ? 'patient-record' :
            dataType === 'EHR/Appointment' ? 'appointment' :
            dataType === 'API/Response' ? 'api-response' :
            `input-${index + 1}`,
      description: getInputDescription(dataType),
      data: dataType
    })),
    outputs: answers.outputs
  };

  // Create or update manifest
  if (existingManifest) {
    // Add tool to existing manifest
    existingManifest.tools.push(newTool);
    const yamlContent = dump(existingManifest, { lineWidth: -1 });
    writeFileSync(manifestPath, yamlContent);
    console.log(chalk.green(`\n✅ Tool added to existing manifest!`));
  } else {
    // Create new manifest with minimal structure
    const newManifest: PartnerIntegrationManifest = {
      name: 'my-partner-integration',
      description: 'Partner integration for healthcare data processing',
      version: '0.0.1',
      auth: {
        tenantId: '00000000-0000-0000-0000-000000000000'
      },
      tools: [newTool]
    };

    const yamlContent = dump(newManifest, { lineWidth: -1 });
    writeFileSync(manifestPath, yamlContent);
    console.log(chalk.green(`\n✅ New integration manifest created!`));
    console.log(chalk.yellow('⚠️  Don\'t forget to update the integration name, description, and tenant ID'));
  }

  console.log(chalk.gray(`📁 Manifest saved to: ${manifestPath}`));
  console.log(chalk.blue('\n🎯 What\'s Next?'));
  console.log(chalk.gray('   • Review and update the generated manifest'));
  console.log(chalk.gray('   • Update endpoint URLs with your actual API'));
  console.log(chalk.gray('   • Test your integration locally'));
  console.log(chalk.gray('   • Package for deployment: partner-integration package'));
}

async function generateFromTemplate(options: GenerateOptions): Promise<void> {
  console.log(chalk.gray(`Generating from template: ${options.template}\n`));

  const template = await getTemplate(options.template!);
  if (!template) {
    console.log(chalk.red(`❌ Template '${options.template}' not found`));
    console.log(chalk.gray('Available templates: ehr-integration, api-connector, data-sync, custom'));
    process.exit(1);
  }

  const manifestPath = options.output || 'integration.yaml';
  
  // Create manifest from template
  const manifest: PartnerIntegrationManifest = {
    name: template.name,
    description: template.description,
    version: template.version,
    auth: {
      tenantId: '00000000-0000-0000-0000-000000000000'
    },
    tools: template.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      endpoint: tool.endpoint,
      inputs: tool.inputs,
      outputs: tool.outputs
    }))
  };

  const yamlContent = dump(manifest, { lineWidth: -1 });
  writeFileSync(manifestPath, yamlContent);

  console.log(chalk.green('✅ Integration manifest generated from template!'));
  console.log(chalk.gray(`📁 Manifest saved to: ${manifestPath}`));
  console.log(chalk.gray(`🛠️  Template: ${options.template}`));
  console.log(chalk.gray(`📊 Tools: ${manifest.tools.length}`));

  console.log(chalk.blue('\n🎯 What\'s Next?'));
  console.log(chalk.yellow('⚠️  Required Updates:'));
  console.log(chalk.gray('   • Update integration name and description'));
  console.log(chalk.gray('   • Set correct Azure tenant ID'));
  console.log(chalk.gray('   • Update endpoint URLs with your actual APIs'));
  console.log(chalk.gray('   • Customize inputs and outputs as needed'));
  
  console.log(chalk.yellow('\n🔧 Development:'));
  console.log(chalk.gray('   • Validate: partner-integration validate integration.yaml'));
  console.log(chalk.gray('   • Add more tools: partner-integration generate --interactive'));
  console.log(chalk.gray('   • Package: partner-integration package'));
}