import fs from 'fs-extra';
const { writeFileSync } = fs;
import path from 'path';
import chalk from 'chalk';
import type { InitOptions, ConnectorIntegrationManifest } from '../types.js';
import { runConnectorManifestWizard } from '../shared/prompts.js';
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

  const outputPath= path.join(options.output || '.', 'extension.yaml');
  const yamlContent = dumpManifestYaml(manifest);

  writeFileSync(outputPath, yamlContent);

  console.log(chalk.green('\n✅ Clinical Application Connector project initialized successfully!'));
  console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));

  // Enhanced next steps with better organization
  console.log(chalk.blue('\n🎯 What\'s Next?'));

  console.log(chalk.yellow('🔧 Next Steps:'));
  console.log(chalk.gray('   1. Review the generated extension.yaml and adjust defaults as needed'));
  console.log(chalk.gray('   2. Implement your server authentication validation logic'));
  console.log(chalk.gray('   3. Build your partner runtime to honor the manifest configuration'));

  console.log(chalk.yellow('\n📦 Deployment Steps:'));
  console.log(chalk.gray('   1. Package your integration: dragon-copilot connector package'));
  console.log(chalk.gray('   2. Submit to Dragon Copilot marketplace'));

  console.log(chalk.blue('\n📚 Resources:'));
  console.log(chalk.gray('   • Validate your integration: dragon-copilot connector validate'));
  console.log(chalk.gray('   • Regenerate the manifest interactively: dragon-copilot connector generate --interactive'));
  console.log(chalk.gray('   • Package for deployment: dragon-copilot connector package'));
}
