import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync, ensureDirSync, copyFileSync, pathExistsSync } = fs;
import yaml from 'js-yaml';
const { dump } = yaml;
import path from 'path';
import chalk from 'chalk';
import { InitOptions, PartnerIntegrationManifest } from '../types.js';
import { promptIntegrationDetails, promptToolDetails, promptPublisherDetails, promptAuthDetails, getInputDescription } from '../shared/prompts.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🤝 Partner Integration Generator'));
  console.log(chalk.gray('Initializing a new partner integration project...\n'));

  // Step 1: Integration Details
  console.log(chalk.blue('📝 Step 1: Integration Details'));
  console.log(chalk.gray('Let\'s start with basic information about your partner integration.\n'));

  const integrationDetails = await promptIntegrationDetails({
    name: options.name,
    description: options.description,
    version: options.version
  });

  // Step 2: Authentication Configuration
  console.log(chalk.blue('\n🔐 Step 2: Authentication Configuration'));
  console.log(chalk.gray('Configure authentication for your partner integration.\n'));

  const authDetails = await promptAuthDetails();

  // Step 3: Publisher Configuration
  console.log(chalk.blue('\n📋 Step 3: Publisher Configuration'));
  console.log(chalk.gray('Publisher information is required for deployment and marketplace listing.'));
  console.log(chalk.gray('This creates a separate publisher.json file that can be reused across integrations.\n'));

  const createPublisherConfig = await confirm({
    message: 'Create publisher configuration file (publisher.json)?',
    default: true
  });

  let publisherConfig = null;
  if (createPublisherConfig) {
    publisherConfig = await promptPublisherDetails();
  }

  // Step 4: Assets Setup
  console.log(chalk.blue('\n🎨 Step 4: Assets Setup'));
  console.log(chalk.gray('Integrations require a large logo (216x216 to 350x350 px) for marketplace listing.'));
  console.log(chalk.gray('We\'ll create an assets directory with a sample logo to get you started.\n'));

  const setupAssets = await confirm({
    message: 'Create assets directory with sample logo?',
    default: true
  });

  if (setupAssets) {
    const assetsDir = path.join(options.output || '.', 'assets');
    ensureDirSync(assetsDir);

    // Copy sample logo from CLI resources
    const sampleLogoPath = path.join(__dirname, '..', 'resources', 'assets', 'logo_large.png');
    const targetLogoPath = path.join(assetsDir, 'logo_large.png');

    if (pathExistsSync(sampleLogoPath)) {
      copyFileSync(sampleLogoPath, targetLogoPath);
      console.log(chalk.green('✅ Sample logo copied to assets/logo_large.png'));
      console.log(chalk.yellow('⚠️  Remember to replace this with your own logo before packaging!'));
    } else {
      // If sample logo doesn't exist, create a placeholder message
      console.log(chalk.yellow('⚠️  Sample logo not found. Please add your logo to assets/logo_large.png'));
      console.log(chalk.gray('   Requirements: PNG file, 216x216 to 350x350 pixels'));
    }
  }

  // Step 5: Integration Tools
  console.log(chalk.blue('\n🛠️  Step 5: Integration Tools'));
  console.log(chalk.gray('Tools define the functionality your partner integration provides.'));
  console.log(chalk.gray('Each tool processes specific types of data and returns results.\n'));

  const addTool = await confirm({
    message: 'Add an initial tool?',
    default: true
  });

  const manifest: PartnerIntegrationManifest = {
    name: integrationDetails.name,
    description: integrationDetails.description,
    version: integrationDetails.version,
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
        toolName: 'my-integration-tool',
        toolDescription: 'Processes integration data',
        endpoint: 'https://api.example.com/integration-route/v1/process'
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
              dataType === 'DSP/Patient' ? 'patient' :
              dataType === 'DSP/Encounter' ? 'encounter' :
              `input-${index + 1}`,
        description: getInputDescription(dataType),
        data: dataType
      })),
      outputs: toolDetails.outputs
    });
  }

  const outputPath = path.join(options.output || '.', 'integration.yaml');
  const yamlContent = dump(manifest, { lineWidth: -1 });

  writeFileSync(outputPath, yamlContent);

  // Create publisher.json if requested
  if (publisherConfig) {
    const publisherPath = path.join(options.output || '.', 'publisher.json');
    writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
    console.log(chalk.green('\n✅ Publisher configuration created successfully!'));
    console.log(chalk.gray(`📁 Publisher config created at: ${publisherPath}`));
  }

  console.log(chalk.green('\n✅ Partner integration project initialized successfully!'));
  console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));
  if (setupAssets) {
    console.log(chalk.gray(`🎨 Assets directory created at: assets/`));
  }

  // Enhanced next steps with better organization
  console.log(chalk.blue('\n🎯 What\'s Next?'));

  if (setupAssets) {
    console.log(chalk.yellow('🎨 Logo Requirements:'));
    console.log(chalk.gray('   • Replace assets/logo_large.png with your own logo'));
    console.log(chalk.gray('   • Size: 216x216 to 350x350 pixels (PNG format)'));
    console.log(chalk.gray('   • This will be used to generate Medium (90x90) and Small (48x48) logos'));
  }

  if (addTool) {
    console.log(chalk.yellow('🔧 Development Steps:'));
    console.log(chalk.gray('   1. Update the endpoint URL with your actual API'));
    console.log(chalk.gray('   2. Customize inputs and outputs as needed'));
    console.log(chalk.gray('   3. Test your integration locally'));

    if (publisherConfig) {
      console.log(chalk.yellow('\n📦 Deployment Steps:'));
      console.log(chalk.gray('   1. Review and update publisher configuration'));
      console.log(chalk.gray('   2. Package your integration: partner-integration package'));
      console.log(chalk.gray('   3. Deploy to the marketplace'));
    }
  } else {
    console.log(chalk.yellow('🔧 Next Steps:'));
    console.log(chalk.gray('   1. Add tools to your integration: partner-integration generate --interactive'));
    console.log(chalk.gray('   2. Update the manifest with your API endpoints'));
    console.log(chalk.gray('   3. Test and package your integration'));
  }

  console.log(chalk.blue('\n📚 Resources:'));
  console.log(chalk.gray('   • Validate your integration: partner-integration validate'));
  console.log(chalk.gray('   • Add more tools: partner-integration generate --interactive'));
  console.log(chalk.gray('   • Package for deployment: partner-integration package'));
}