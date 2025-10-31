import fs from 'fs-extra';
const { readFileSync, existsSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import path from 'path';
import chalk from 'chalk';
import type { DragonExtensionManifest, PublisherConfig } from '../types.js';
import { validateExtensionManifest, validatePublisherConfig, getFieldDisplayName } from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🐉 Validating Dragon Copilot Extension Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  let hasErrors = false;
  let hasWarnings = false;

  // Validate manifest file
  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as DragonExtensionManifest;

    console.log(chalk.blue('📋 Validating Extension Manifest...'));
    const manifestResult = validateExtensionManifest(manifest);

    if (manifestResult.errors.length > 0) {
      hasErrors = true;
      console.log(chalk.red('❌ Manifest validation failed with errors:'));
      manifestResult.errors.forEach((error: SchemaError) => {
        // Convert schema path to friendly field name
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
        console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
      });
    }

    // Check for publisher.json in the same directory
    const manifestDir = path.dirname(filePath);
    const publisherPath = path.join(manifestDir, 'publisher.json');

    if (existsSync(publisherPath)) {
      console.log(chalk.blue('\n📋 Validating Publisher Configuration...'));
      try {
        const publisherContent = readFileSync(publisherPath, 'utf8');
        const publisherConfig = JSON.parse(publisherContent) as PublisherConfig;

        const publisherResult = validatePublisherConfig(publisherConfig);

        if (publisherResult.errors.length > 0) {
          hasErrors = true;
          console.log(chalk.red('❌ Publisher config validation failed with errors:'));
          publisherResult.errors.forEach((error: SchemaError) => {
            // Convert schema path to friendly field name
            const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
            const fieldName = getFieldDisplayName(fieldPath) || fieldPath || 'config';
            console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
          });
        }

      } catch (publisherError) {
        hasErrors = true;
        if (publisherError instanceof Error) {
          console.log(chalk.red(`❌ Publisher config parsing error: ${publisherError.message}`));
        } else {
          console.log(chalk.red('❌ Publisher config parsing error: Unknown error'));
        }
      }
    } else {
      hasWarnings = true;
      console.log(chalk.yellow('\n⚠️  No publisher.json found - consider creating one for extension publishing'));
    }

    // Display results summary
    if (!hasErrors) {
      console.log(chalk.green('\n✅ Validation passed!'));

      // Display summary
      console.log(chalk.gray('\n📊 Extension Summary:'));
      console.log(chalk.gray(`  • Extension: ${manifest.name} v${manifest.version}`));
      if (manifest.manifestVersion) {
        console.log(chalk.gray(`  • Manifest Schema Version: ${manifest.manifestVersion}`));
      }
      console.log(chalk.gray(`  • Description: ${manifest.description}`));
      console.log(chalk.gray(`  • Auth Tenant ID: ${manifest.auth?.tenantId || 'Not specified'}`));
      console.log(chalk.gray(`  • Tools: ${manifest.tools?.length || 0}`));
  console.log(chalk.gray(`  • Automation Scripts: ${manifest.automationScripts?.length || 0}`));
  console.log(chalk.gray(`  • Event Triggers: ${manifest.eventTriggers?.length || 0}`));
  console.log(chalk.gray(`  • Dependencies: ${manifest.dependencies?.length || 0}`));

      if (existsSync(publisherPath)) {
        try {
          const publisherConfig = JSON.parse(readFileSync(publisherPath, 'utf8')) as PublisherConfig;
          console.log(chalk.gray(`  • Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`));
          console.log(chalk.gray(`  • Supported Locales: ${publisherConfig.supportedLocales?.join(', ') || 'None'}`));
          console.log(chalk.gray(`  • Supported Regions: ${publisherConfig.regions?.join(', ') || 'None'}`));
        } catch {
          // Ignore parsing errors for summary
        }
      }

      if (manifest.tools && manifest.tools.length > 0) {
        manifest.tools.forEach(tool => {
          console.log(chalk.gray(`    - ${tool.name}: ${tool.inputs?.length || 0} inputs, ${tool.outputs?.length || 0} outputs`));
        });
      }

      if (hasWarnings) {
        console.log(chalk.yellow('\n💡 Consider addressing the warnings above for better compliance.'));
      }
    } else {
      process.exit(1);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`❌ Failed to parse manifest file: ${error.message}`));
    } else {
      console.log(chalk.red('❌ Failed to parse manifest file: Unknown error'));
    }
    process.exit(1);
  }
}
