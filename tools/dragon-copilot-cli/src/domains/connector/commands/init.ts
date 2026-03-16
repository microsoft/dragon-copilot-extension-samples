import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync } = fs;
import path from 'path';
import chalk from 'chalk';
import { bootstrapAssetsDirectory } from '../../../common/index.js';
import type { InitOptions, ConnectorIntegrationManifest } from '../types.js';
import { promptPublisherDetails, runConnectorManifestWizard } from '../shared/prompts.js';
import { normalizeNoteSections } from '../shared/note-sections.js';
import { dumpManifestYaml } from '../shared/yaml.js';

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🤝 Clinical Application Connector Generator'));
  console.log(chalk.gray('Initializing a new Clinical Application Connector project...\n'));

  // Step 1: Connector Manifest Wizard
  console.log(chalk.blue('🧙 Step 1: Connector Manifest Wizard'));
  console.log(chalk.gray('We\'ll gather the details needed for your Clinical Application Connector manifest, including authentication, documentation sections, and instance configuration.\n'));

  const manifest: ConnectorIntegrationManifest = await runConnectorManifestWizard({
    ...(options.name ? { name: options.name } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.version ? { version: options.version } : {})
  });

  manifest['note-sections'] = normalizeNoteSections(manifest['note-sections']);

  console.log(chalk.green('\n✅ Manifest details captured!'));
  console.log(chalk.gray(`   • Server authentication issuers: ${manifest['server-authentication']?.length || 0}`));
  console.log(chalk.gray(`   • Note sections configured: ${Object.keys(manifest['note-sections'] ?? {}).length}`));
  console.log(chalk.gray(`   • Context items collected: ${manifest.instance['context-retrieval']?.instance?.length || 0}`));

  // Step 2: Publisher Configuration
  console.log(chalk.blue('\n📋 Step 2: Publisher Configuration'));
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

  // Step 3: Assets Setup
  console.log(chalk.blue('\n🎨 Step 3: Assets Setup'));
  console.log(chalk.gray('Integrations require a large logo (216x216 to 350x350 px) for marketplace listing.'));
  console.log(chalk.gray('We\'ll create an assets directory with a sample logo to get you started.\n'));

  const setupAssets = await confirm({
    message: 'Create assets directory with sample logo?',
    default: true
  });

  if (setupAssets) {
    await bootstrapAssetsDirectory(options.output || '.', {
      assetsDirName: 'assets'
    });
  }

  const outputPath = path.join(options.output || '.', 'extension.yaml');
  const yamlContent = dumpManifestYaml(manifest);

  writeFileSync(outputPath, yamlContent);

  // Create publisher.json if requested
  if (publisherConfig) {
    const publisherPath = path.join(options.output || '.', 'publisher.json');
    writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
    console.log(chalk.green('\n✅ Publisher configuration created successfully!'));
    console.log(chalk.gray(`📁 Publisher config created at: ${publisherPath}`));
  }

  console.log(chalk.green('\n✅ Clinical Application Connector project initialized successfully!'));
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

  console.log(chalk.yellow('🔧 Next Steps:'));
  console.log(chalk.gray('   1. Review the generated extension.yaml and adjust defaults as needed'));
  console.log(chalk.gray('   2. Implement your server authentication validation logic'));
  console.log(chalk.gray('   3. Build your partner runtime to honor the manifest configuration'));

  if (publisherConfig) {
    console.log(chalk.yellow('\n📦 Deployment Steps:'));
    console.log(chalk.gray('   1. Review and update publisher.json'));
    console.log(chalk.gray('   2. Package your integration: dragon-copilot connector package'));
    console.log(chalk.gray('   3. Submit to Dragon Copilot marketplace'));
  }

  console.log(chalk.blue('\n📚 Resources:'));
  console.log(chalk.gray('   • Validate your integration: dragon-copilot connector validate'));
  console.log(chalk.gray('   • Regenerate the manifest interactively: dragon-copilot connector generate --interactive'));
  console.log(chalk.gray('   • Package for deployment: dragon-copilot connector package'));
}
