import fs from 'fs-extra';
const { readFileSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import chalk from 'chalk';
import { DragonExtensionManifest } from '../types.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🐉 Validating Dragon Copilot Extension Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as DragonExtensionManifest;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.description) errors.push('Missing required field: description');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.tools || !Array.isArray(manifest.tools)) {
      errors.push('Missing or invalid tools array');
    }

    // Validate version format
    if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Version must be in format x.y.z');
    }

    // Validate extension name format
    if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name)) {
      warnings.push('Extension name should contain only lowercase letters, numbers, and hyphens');
    }

    // Validate tools
    if (manifest.tools && Array.isArray(manifest.tools)) {
      if (manifest.tools.length === 0) {
        warnings.push('No tools defined in manifest');
      }

      manifest.tools.forEach((tool, index) => {
        const toolPrefix = `Tool ${index + 1} (${tool.name || 'unnamed'})`;

        if (!tool.name) errors.push(`${toolPrefix}: Missing required field: name`);
        if (!tool.description) errors.push(`${toolPrefix}: Missing required field: description`);
        if (!tool.endpoint) errors.push(`${toolPrefix}: Missing required field: endpoint`);

        // Validate tool name format
        if (tool.name && !/^[a-z0-9-]+$/.test(tool.name)) {
          warnings.push(`${toolPrefix}: Tool name should contain only lowercase letters, numbers, and hyphens`);
        }

        // Validate endpoint URL
        if (tool.endpoint) {
          try {
            new URL(tool.endpoint);
          } catch {
            errors.push(`${toolPrefix}: Invalid endpoint URL`);
          }
        }

        // Validate inputs
        if (!tool.inputs || !Array.isArray(tool.inputs)) {
          errors.push(`${toolPrefix}: Missing or invalid inputs array`);
        } else if (tool.inputs.length === 0) {
          warnings.push(`${toolPrefix}: No inputs defined`);
        } else {
          tool.inputs.forEach((input, inputIndex) => {
            const inputPrefix = `${toolPrefix} Input ${inputIndex + 1}`;
            if (!input.name) errors.push(`${inputPrefix}: Missing required field: name`);
            if (!input.description) errors.push(`${inputPrefix}: Missing required field: description`);
            if (!input.data) errors.push(`${inputPrefix}: Missing required field: data`);

            // Validate known data types
            if (input.data && !isValidDataType(input.data)) {
              warnings.push(`${inputPrefix}: Unknown data type '${input.data}'`);
            }
          });
        }

        // Validate outputs
        if (!tool.outputs || !Array.isArray(tool.outputs)) {
          errors.push(`${toolPrefix}: Missing or invalid outputs array`);
        } else if (tool.outputs.length === 0) {
          warnings.push(`${toolPrefix}: No outputs defined`);
        } else {
          tool.outputs.forEach((output, outputIndex) => {
            const outputPrefix = `${toolPrefix} Output ${outputIndex + 1}`;
            if (!output.name) errors.push(`${outputPrefix}: Missing required field: name`);
            if (!output.description) errors.push(`${outputPrefix}: Missing required field: description`);
            if (!output.data) errors.push(`${outputPrefix}: Missing required field: data`);
          });
        }
      });

      // Check for duplicate tool names
      const toolNames = manifest.tools.map(t => t.name).filter(Boolean);
      const duplicateNames = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        errors.push(`Duplicate tool names found: ${[...new Set(duplicateNames)].join(', ')}`);
      }
    }

    // Display results
    if (errors.length > 0) {
      console.log(chalk.red('❌ Validation failed with errors:'));
      errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings (${warnings.length}):`));
      warnings.forEach(warning => console.log(chalk.yellow(`  • ${warning}`)));
    }

    if (errors.length === 0) {
      console.log(chalk.green('✅ Manifest validation passed!'));

      // Display summary
      console.log(chalk.gray('\n📊 Manifest Summary:'));
      console.log(chalk.gray(`  • Extension: ${manifest.name} v${manifest.version}`));
      console.log(chalk.gray(`  • Description: ${manifest.description}`));
      console.log(chalk.gray(`  • Tools: ${manifest.tools?.length || 0}`));

      if (manifest.tools && manifest.tools.length > 0) {
        manifest.tools.forEach(tool => {
          console.log(chalk.gray(`    - ${tool.name}: ${tool.inputs?.length || 0} inputs, ${tool.outputs?.length || 0} outputs`));
        });
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

function isValidDataType(dataType: string): boolean {
  const validTypes = [
    'DSP',
    'DSP/Note',
    'DSP/IterativeTranscript',
    'DSP/IterativeAudio',
    'DSP/Document',
    'DSP/DragonSession',
    'DSP/Patient',
    'DSP/Practitioner',
    'DSP/Encounter',
    'DSP/Visit'
  ];

  return validTypes.includes(dataType);
}
