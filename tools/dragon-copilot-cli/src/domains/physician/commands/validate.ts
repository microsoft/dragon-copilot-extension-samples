import fs from 'fs-extra';
const { readFileSync } = fs;
import { load } from 'js-yaml';
import chalk from 'chalk';
import type { DragonExtensionManifest } from '../types.js';
import {
  validateExtensionManifest,
  LEGACY_SCHEMA_VERSION,
  LATEST_SCHEMA_VERSION
} from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🐉 Validating Dragon Copilot Physician Workflow Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as DragonExtensionManifest;

    console.log(chalk.blue('📋 Validating Physician Workflow Manifest...'));
    const manifestResult = validateExtensionManifest(manifest);
    const schemaVersion = manifestResult.schemaVersion;

    if (schemaVersion === LEGACY_SCHEMA_VERSION) {
      console.log(chalk.gray('  • Schema: original format (no schemaVersion)'));
    } else if (schemaVersion) {
      console.log(chalk.gray(`  • Schema: ${schemaVersion}`));
    }

    if (manifestResult.errors.length > 0) {
      hasErrors = true;
      console.log(chalk.red('❌ Manifest validation failed with errors:'));
      manifestResult.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
        console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
      });
    }

    if (schemaVersion === LEGACY_SCHEMA_VERSION && LATEST_SCHEMA_VERSION !== LEGACY_SCHEMA_VERSION) {
      hasWarnings = true;
      console.log(chalk.yellow(`⚠️  This manifest has no schemaVersion and uses the original format. Run 'dragon-copilot physician migrate ${filePath}' to upgrade to ${LATEST_SCHEMA_VERSION}.`));
    }

    if (!hasErrors) {
      console.log(chalk.green(`\n✅ Validation passed!${schemaVersion && schemaVersion !== LEGACY_SCHEMA_VERSION ? ` (schema ${schemaVersion})` : ''}`));

      console.log(chalk.gray('\n📊 Physician Workflow Summary:'));
      console.log(chalk.gray(`  • Extension: ${manifest.name} v${manifest.version}`));
      console.log(chalk.gray(`  • Description: ${manifest.description}`));
      console.log(chalk.gray(`  • Auth Tenant ID: ${manifest.auth?.tenantId || 'Not specified'}`));
      console.log(chalk.gray(`  • Tools: ${manifest.tools?.length || 0}`));

      const tools = (manifest.tools ?? []) as Array<{ name: string; inputs?: unknown[]; outputs?: unknown[] }>;
      tools.forEach(tool => {
        console.log(chalk.gray(`    - ${tool.name}: ${tool.inputs?.length || 0} inputs, ${tool.outputs?.length || 0} outputs`));
      });

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
