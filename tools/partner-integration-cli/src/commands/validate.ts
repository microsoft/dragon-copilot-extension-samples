import fs from 'fs-extra';
const { readFileSync, existsSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import path from 'path';
import chalk from 'chalk';
import { PartnerIntegrationManifest, PublisherConfig } from '../types.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🤝 Validating Partner Integration Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  let hasErrors = false;
  let hasWarnings = false;

  // Validate manifest file
  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as PartnerIntegrationManifest;

    console.log(chalk.blue('📋 Validating Integration Manifest...'));
    
    // Basic validation
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!manifest.name) errors.push('name: Field is required');
    if (!manifest.description) errors.push('description: Field is required');
    if (!manifest.version) errors.push('version: Field is required');
    if (!manifest.auth) errors.push('auth: Field is required');
    if (!manifest.tools || !Array.isArray(manifest.tools)) errors.push('tools: Field is required and must be an array');

    // Version format validation
    if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('version: Must be in format x.y.z (e.g., 1.0.0)');
    }

    // Auth validation
    if (manifest.auth) {
      if (!manifest.auth.tenantId) {
        errors.push('auth.tenantId: Field is required');
      } else {
        const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidPattern.test(manifest.auth.tenantId)) {
          errors.push('auth.tenantId: Must be a valid GUID format');
        }
      }
    }

    // Tools validation
    if (manifest.tools && Array.isArray(manifest.tools)) {
      if (manifest.tools.length === 0) {
        warnings.push('tools: No tools defined - consider adding at least one tool');
      }

      manifest.tools.forEach((tool, index) => {
        const toolPrefix = `tools[${index}]`;
        
        if (!tool.name) errors.push(`${toolPrefix}.name: Field is required`);
        if (!tool.description) errors.push(`${toolPrefix}.description: Field is required`);
        if (!tool.endpoint) errors.push(`${toolPrefix}.endpoint: Field is required`);
        
        // Validate endpoint URL
        if (tool.endpoint) {
          try {
            new URL(tool.endpoint);
          } catch {
            errors.push(`${toolPrefix}.endpoint: Must be a valid URL`);
          }
        }

        // Validate tool name format
        if (tool.name && !/^[a-z0-9-]+$/.test(tool.name)) {
          errors.push(`${toolPrefix}.name: Must contain only lowercase letters, numbers, and hyphens`);
        }

        // Validate inputs
        if (!tool.inputs || !Array.isArray(tool.inputs)) {
          errors.push(`${toolPrefix}.inputs: Field is required and must be an array`);
        } else if (tool.inputs.length === 0) {
          errors.push(`${toolPrefix}.inputs: At least one input is required`);
        } else {
          tool.inputs.forEach((input, inputIndex) => {
            const inputPrefix = `${toolPrefix}.inputs[${inputIndex}]`;
            if (!input.name) errors.push(`${inputPrefix}.name: Field is required`);
            if (!input.description) errors.push(`${inputPrefix}.description: Field is required`);
            if (!input.data) errors.push(`${inputPrefix}.data: Field is required`);
          });
        }

        // Validate outputs
        if (!tool.outputs || !Array.isArray(tool.outputs)) {
          errors.push(`${toolPrefix}.outputs: Field is required and must be an array`);
        } else if (tool.outputs.length === 0) {
          errors.push(`${toolPrefix}.outputs: At least one output is required`);
        } else {
          tool.outputs.forEach((output, outputIndex) => {
            const outputPrefix = `${toolPrefix}.outputs[${outputIndex}]`;
            if (!output.name) errors.push(`${outputPrefix}.name: Field is required`);
            if (!output.description) errors.push(`${outputPrefix}.description: Field is required`);
            if (!output.data) errors.push(`${outputPrefix}.data: Field is required`);
          });
        }
      });

      // Check for duplicate tool names
      const toolNames = manifest.tools.map(t => t.name).filter(Boolean);
      const duplicateNames = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        errors.push(`tools: Duplicate tool names found: ${duplicateNames.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      hasErrors = true;
      console.log(chalk.red('❌ Manifest validation failed with errors:'));
      errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }

    if (warnings.length > 0) {
      hasWarnings = true;
      console.log(chalk.yellow('\n⚠️  Validation warnings:'));
      warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    if (errors.length === 0) {
      console.log(chalk.green('✅ Integration manifest is valid'));
      
      // Display manifest summary
      console.log(chalk.blue('\n📊 Manifest Summary:'));
      console.log(chalk.gray(`  Name: ${manifest.name}`));
      console.log(chalk.gray(`  Description: ${manifest.description}`));
      console.log(chalk.gray(`  Version: ${manifest.version}`));
      console.log(chalk.gray(`  Tools: ${manifest.tools?.length || 0}`));
      if (manifest.tools && manifest.tools.length > 0) {
        manifest.tools.forEach((tool, index) => {
          console.log(chalk.gray(`    ${index + 1}. ${tool.name}: ${tool.inputs?.length || 0} inputs, ${tool.outputs?.length || 0} outputs`));
        });
      }
    }

    // Check for publisher.json in the same directory
    const manifestDir = path.dirname(filePath);
    const publisherPath = path.join(manifestDir, 'publisher.json');

    if (existsSync(publisherPath)) {
      console.log(chalk.blue('\n📋 Validating Publisher Configuration...'));
      try {
        const publisherContent = readFileSync(publisherPath, 'utf8');
        const publisherConfig = JSON.parse(publisherContent) as PublisherConfig;

        const publisherErrors: string[] = [];
        
        // Basic publisher validation
        if (!publisherConfig.publisherId) publisherErrors.push('publisherId: Field is required');
        if (!publisherConfig.publisherName) publisherErrors.push('publisherName: Field is required');
        if (!publisherConfig.websiteUrl) publisherErrors.push('websiteUrl: Field is required');
        if (!publisherConfig.privacyPolicyUrl) publisherErrors.push('privacyPolicyUrl: Field is required');
        if (!publisherConfig.supportUrl) publisherErrors.push('supportUrl: Field is required');
        if (!publisherConfig.contactEmail) publisherErrors.push('contactEmail: Field is required');

        // URL validation
        const urlFields = ['websiteUrl', 'privacyPolicyUrl', 'supportUrl'];
        urlFields.forEach(field => {
          const url = publisherConfig[field as keyof PublisherConfig] as string;
          if (url) {
            try {
              new URL(url);
            } catch {
              publisherErrors.push(`${field}: Must be a valid URL`);
            }
          }
        });

        // Email validation
        if (publisherConfig.contactEmail) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(publisherConfig.contactEmail)) {
            publisherErrors.push('contactEmail: Must be a valid email address');
          }
        }

        if (publisherErrors.length > 0) {
          hasErrors = true;
          console.log(chalk.red('❌ Publisher config validation failed with errors:'));
          publisherErrors.forEach(error => {
            console.log(chalk.red(`  • ${error}`));
          });
        } else {
          console.log(chalk.green('✅ Publisher configuration is valid'));
          console.log(chalk.gray(`  Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`));
        }

      } catch (parseError) {
        hasErrors = true;
        console.log(chalk.red('❌ Failed to parse publisher.json:'));
        console.log(chalk.red(`  • Invalid JSON format`));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  No publisher.json found'));
      console.log(chalk.gray('  A publisher configuration is required for packaging'));
      console.log(chalk.gray('  Create one using: partner-integration init'));
    }

  } catch (parseError) {
    hasErrors = true;
    console.log(chalk.red('❌ Failed to parse manifest file:'));
    if (parseError instanceof Error) {
      console.log(chalk.red(`  • ${parseError.message}`));
    } else {
      console.log(chalk.red('  • Invalid YAML format'));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log(chalk.red('❌ Validation failed with errors'));
    console.log(chalk.gray('Fix the errors above before packaging your integration'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow('⚠️  Validation passed with warnings'));
    console.log(chalk.gray('Consider addressing the warnings above'));
  } else {
    console.log(chalk.green('✅ All validations passed!'));
    console.log(chalk.gray('Your integration is ready to be packaged'));
  }
}