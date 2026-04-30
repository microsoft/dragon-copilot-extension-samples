import fs from 'fs-extra';
const { readFileSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import chalk from 'chalk';
import type { DcrExtensionManifest } from '../types.js';
import { validateExtensionManifest } from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('?? Validating Dragon Copilot Radiology Extension Manifest'));
  console.log(chalk.gray(`?? File: ${filePath}\n`));

  let hasErrors = false;

  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as DcrExtensionManifest;

    console.log(chalk.blue('?? Validating Radiology Extension Manifest...'));
    const manifestResult = validateExtensionManifest(manifest);

    if (manifestResult.errors.length > 0) {
      hasErrors = true;
      console.log(chalk.red('? Manifest validation failed with errors:'));
      manifestResult.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
        console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
      });
    }

    if (!hasErrors) {
      console.log(chalk.green('\n? Validation passed!'));

      console.log(chalk.gray('\n?? Radiology Extension Summary:'));
      console.log(chalk.gray(`  • Extension: ${manifest.name} v${manifest.version}`));
      console.log(chalk.gray(`  • Description: ${manifest.description}`));
      console.log(chalk.gray(`  • Auth Tenant ID: ${manifest.auth?.tenantId || 'Not specified'}`));
      console.log(chalk.gray(`  • Tools: ${manifest.tools?.length || 0}`));

      if (manifest.tools && manifest.tools.length > 0) {
        manifest.tools.forEach(tool => {
          console.log(chalk.gray(`    - ${tool.name} [${tool.capability}]: ${tool.inputs?.length || 0} inputs, ${tool.outputs?.length || 0} outputs`));
        });
      }
    } else {
      process.exit(1);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`? Failed to parse manifest file: ${error.message}`));
    } else {
      console.log(chalk.red('? Failed to parse manifest file: Unknown error'));
    }
    process.exit(1);
  }
}
