import fs from 'fs-extra';
const { readFileSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import chalk from 'chalk';
import type { DragonExtensionManifest } from '../types.js';
import { validateExtensionManifest } from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🐉 Validating Dragon Copilot Physician Workflow Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  let hasErrors = false;
  let hasWarnings = false;

  // Validate manifest file
  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as DragonExtensionManifest;

    console.log(chalk.blue('📋 Validating Physician Workflow Manifest...'));
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

    // Display results summary
    if (!hasErrors) {
      console.log(chalk.green('\n✅ Validation passed!'));

      // Display summary
      console.log(chalk.gray('\n📊 Physician Workflow Summary:'));
      console.log(chalk.gray(`  • Extension: ${manifest.name} v${manifest.version}`));
      console.log(chalk.gray(`  • Description: ${manifest.description}`));
      console.log(chalk.gray(`  • Auth Tenant ID: ${manifest.auth?.tenantId || 'Not specified'}`));
      console.log(chalk.gray(`  • Tools: ${manifest.tools?.length || 0}`));

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
