import fs from 'fs-extra';
const { readFileSync, writeFileSync, existsSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import type { GenerateOptions, IntegrationDetails, PartnerIntegrationManifest } from '../types.js';
import { getTemplate } from '../templates/index.js';
import { promptPublisherDetails, runPartnerManifestWizard } from '../shared/prompts.js';
import { normalizeNoteSections } from '../shared/note-sections.js';
import { dumpManifestYaml } from '../shared/yaml.js';

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

  const manifestPath = options.output || 'extension.yaml';
  let defaults: Partial<IntegrationDetails> | undefined;

  try {
    const existing = readFileSync(manifestPath, 'utf8');
    const parsed = load(existing) as PartnerIntegrationManifest;
    console.log(chalk.yellow('📄 Found existing integration manifest. The wizard will use its metadata as defaults.'));
    defaults = {
      name: parsed.name,
      description: parsed.description,
      version: parsed.version,
      partnerId: parsed['partner-id'],
      clinicalApplicationName: parsed['clinical-application-name']
    };
  } catch {
    console.log(chalk.gray('ℹ️  No existing manifest detected. A new file will be created.'));
  }

  const manifest = await runPartnerManifestWizard(defaults);
  manifest['note-sections'] = normalizeNoteSections(manifest['note-sections']);
  const yamlContent = dumpManifestYaml(manifest);
  writeFileSync(manifestPath, yamlContent);

  console.log(chalk.green('\n✅ Partner integration manifest generated!'));
  console.log(chalk.gray(`📁 Manifest saved to: ${manifestPath}`));

  const publisherPath = 'publisher.json';
  const publisherExists = existsSync(publisherPath);

  const shouldManagePublisher = await confirm({
    message: publisherExists
      ? 'Update publisher.json while you\'re here?'
      : 'Create publisher.json for marketplace metadata?',
    default: !publisherExists
  });

  if (shouldManagePublisher) {
    const publisherConfig = await promptPublisherDetails();
    writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
    console.log(chalk.green(`✅ Publisher configuration ${publisherExists ? 'updated' : 'created'}!`));
  }

  console.log(chalk.blue('\n🎯 What\'s Next?'));
  console.log(chalk.gray('   • Review server authentication issuers and identity claims'));
  console.log(chalk.gray('   • Align your integration services with the generated note sections and context requirements'));
  console.log(chalk.gray('   • Validate the manifest: dragon-copilot partner validate'));
  console.log(chalk.gray('   • Package for deployment: dragon-copilot partner package'));
}

async function generateFromTemplate(options: GenerateOptions): Promise<void> {
  console.log(chalk.gray(`Generating from template: ${options.template}\n`));

  const template = await getTemplate(options.template!);
  if (!template) {
    console.log(chalk.red(`❌ Template '${options.template}' not found`));
    console.log(chalk.gray('Available templates: ehr-integration, api-connector, data-sync, custom'));
    process.exit(1);
  }

  const manifestPath = options.output || 'extension.yaml';
  template.manifest['note-sections'] = normalizeNoteSections(template.manifest['note-sections']);
  const yamlContent = dumpManifestYaml(template.manifest);
  writeFileSync(manifestPath, yamlContent);

  console.log(chalk.green('✅ Integration manifest generated from template!'));
  console.log(chalk.gray(`📁 Manifest saved to: ${manifestPath}`));
  console.log(chalk.gray(`🛠️  Template: ${options.template}`));
  console.log(chalk.gray(`🔐 Server authentication issuers: ${template.manifest['server-authentication']?.length || 0}`));
  console.log(chalk.gray(`🗂️  Note sections configured: ${Object.keys(template.manifest['note-sections'] ?? {}).length}`));

  console.log(chalk.blue('\n🎯 What\'s Next?'));
  console.log(chalk.yellow('⚠️  Required Updates:'));
  console.log(chalk.gray('   • Update integration name, description, and partner ID to match your organization'));
  console.log(chalk.gray('   • Verify issuer URLs, identity claims, and collected context'));
  console.log(chalk.gray('   • Align context retrieval fields with your runtime'));
  
  console.log(chalk.yellow('\n🔧 Development:'));
  console.log(chalk.gray('   • Validate: dragon-copilot partner validate extension.yaml'));
  console.log(chalk.gray('   • Regenerate interactively: dragon-copilot partner generate --interactive'));
  console.log(chalk.gray('   • Package: dragon-copilot partner package'));
}