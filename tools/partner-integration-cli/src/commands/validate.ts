import fs from 'fs-extra';
const { readFileSync, existsSync } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import path from 'path';
import chalk from 'chalk';
import { input, select } from '@inquirer/prompts';
import type { ContextRetrievalItem, PartnerIntegrationManifest, PublisherConfig, YesNo } from '../types.js';
import { getContextItemDefinition } from '../shared/context-items.js';

const DEFAULT_MANIFEST_PATH = 'integration.yaml';

export async function runValidateCommand(filePath?: string): Promise<void> {
  let targetPath = filePath?.trim();

  if (!targetPath) {
    console.log(chalk.yellow('⚠️  Missing manifest file argument.'));
    console.log(chalk.gray('This usually happens when:'));
    console.log(chalk.gray('  • `partner-integration validate` is run without a file path.'));
    console.log(chalk.gray('  • The manifest file has not been generated in the current directory.'));

    const nextStep = await select({
      message: 'How would you like to continue?',
      choices: [
        {
          name: `Validate the default manifest in this directory (${DEFAULT_MANIFEST_PATH})`,
          value: 'default'
        },
        {
          name: 'Enter a different manifest path',
          value: 'custom'
        },
        {
          name: 'Cancel validation',
          value: 'cancel'
        }
      ]
    });

    if (nextStep === 'cancel') {
      console.log(chalk.gray('Validation cancelled. Provide a manifest file path to validate later.'));
      return;
    }

    if (nextStep === 'custom') {
      targetPath = await input({
        message: 'Enter the path to the manifest file:',
        default: DEFAULT_MANIFEST_PATH,
        validate: value => (value && value.trim() ? true : 'Please provide a file path.')
      });
    } else {
      targetPath = DEFAULT_MANIFEST_PATH;
    }
  }

  const resolvedPath = path.resolve(targetPath);

  if (!existsSync(resolvedPath)) {
    console.log(chalk.red('❌ Manifest file not found:'));
    console.log(chalk.red(`  • ${resolvedPath}`));
    console.log(chalk.gray('Ensure the manifest exists or generate one with `partner-integration init`.'));
    process.exit(1);
  }

  await validateManifest(resolvedPath);
}

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
    
    const errors: string[] = [];
    const warnings: string[] = [];

    const validateUrl = (url: string, field: string): void => {
      try {
        new URL(url);
      } catch {
        errors.push(`${field}: Must be a valid URL`);
      }
    };

    const validateGuid = (value: string, field: string): void => {
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidPattern.test(value)) {
        errors.push(`${field}: Must be a valid GUID`);
      }
    };

    const requireString = (value: unknown, field: string): string | undefined => {
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${field}: Field is required`);
        return undefined;
      }
      return value.trim();
    };

    const checkYesNo = (value: unknown, field: string, required = false): void => {
      if (value === undefined || value === null) {
        if (required) {
          errors.push(`${field}: Field is required`);
        }
        return;
      }
      if (value !== 'yes' && value !== 'no') {
        errors.push(`${field}: Must be 'yes' or 'no'`);
      }
    };

    const checkFieldDefinition = (field: any, prefix: string, options: { requireName?: boolean } = {}): void => {
      if (!field || typeof field !== 'object') {
        errors.push(`${prefix}: Field definition is required`);
        return;
      }

      if (options.requireName) {
        requireString(field.name, `${prefix}.name`);
      } else if (field.name !== undefined && (typeof field.name !== 'string' || !field.name.trim())) {
        errors.push(`${prefix}.name: Must be a non-empty string when provided`);
      }

      const typeValue = requireString(field.type, `${prefix}.type`);
      requireString(field.description, `${prefix}.description`);
      checkYesNo(field.required, `${prefix}.required`, true);

      if (field['default-value'] !== undefined) {
        if (typeof field['default-value'] !== 'string' || !field['default-value'].trim()) {
          errors.push(`${prefix}.default-value: Must be a non-empty string when provided`);
        } else if (typeValue === 'url') {
          validateUrl(field['default-value'].trim(), `${prefix}.default-value`);
        }
      }
    };

    const normalizeString = (value: unknown): string | undefined => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    };

    const normalizeYesNo = (value: unknown): YesNo | undefined => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const normalized = value.trim().toLowerCase();
      return normalized === 'yes' || normalized === 'no' ? (normalized as YesNo) : undefined;
    };

    const validateContextItems = (rawSection: unknown): string[] => {
      if (rawSection === undefined || rawSection === null) {
        return [];
      }

      const contextErrors: string[] = [];

      if (typeof rawSection !== 'object' || Array.isArray(rawSection)) {
        contextErrors.push('instance.context-retrieval: Must be an object containing an instance array');
        return contextErrors;
      }

      const rawItems = (rawSection as { instance?: unknown }).instance;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        contextErrors.push('instance.context-retrieval.instance: Provide at least one predefined context item when context retrieval is enabled');
        return contextErrors;
      }

      const seenNames = new Set<string>();

      rawItems.forEach((rawItem, index) => {
        const prefix = `instance.context-retrieval.instance[${index}]`;
        if (typeof rawItem !== 'object' || rawItem === null) {
          contextErrors.push(`${prefix}: Entry must be an object with name, type, description, and required fields`);
          return;
        }

        const item = rawItem as ContextRetrievalItem;
        const name = normalizeString(item.name);
        if (!name) {
          contextErrors.push(`${prefix}.name: Field is required`);
          return;
        }

        if (seenNames.has(name)) {
          contextErrors.push(`${prefix}.name: Duplicate context item '${name}'`);
          return;
        }
        seenNames.add(name);

        const definition = getContextItemDefinition(name);
        if (!definition) {
          contextErrors.push(`${prefix}.name: '${name}' is not a supported context item`);
          return;
        }

        const typeValue = normalizeString(item.type);
        if (!typeValue) {
          contextErrors.push(`${prefix}.type: Field is required`);
        } else if (typeValue !== definition.type) {
          contextErrors.push(`${prefix}.type: Must be '${definition.type}'`);
        }

        const descriptionValue = normalizeString(item.description);
        if (!descriptionValue) {
          contextErrors.push(`${prefix}.description: Field is required`);
        } else if (descriptionValue !== definition.description) {
          contextErrors.push(`${prefix}.description: Must be '${definition.description}'`);
        }

        const requiredValue = normalizeYesNo(item.required);
        if (!requiredValue) {
          contextErrors.push(`${prefix}.required: Must be 'yes' or 'no'`);
        }

        if (Object.prototype.hasOwnProperty.call(item, 'default-value')) {
          contextErrors.push(
            `${prefix}.default-value: Default values are not supported for context items`
          );
        }
      });

      return contextErrors;
    };

  const version = requireString(manifest.version, 'version');
  const partnerId = requireString(manifest['partner-id'], 'partner-id');
    requireString(manifest.name, 'name');
    requireString(manifest.description, 'description');

    if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
      errors.push('version: Must be in format x.y.z (e.g., 1.0.0)');
    }

    if (partnerId && !/^[a-z0-9][a-z0-9\-_.]*[a-z0-9]$/.test(partnerId)) {
      errors.push('partner-id: Must start and end with alphanumeric characters and can include lowercase letters, numbers, hyphens, underscores, or periods');
    }

    const serverAuthentication = manifest['server-authentication'];
    if (!Array.isArray(serverAuthentication) || serverAuthentication.length === 0) {
      errors.push('server-authentication: Provide at least one issuer entry');
    } else {
      serverAuthentication.forEach((entry, index) => {
        const prefix = `server-authentication[${index}]`;
        const issuer = requireString(entry?.issuer, `${prefix}.issuer`);
        if (issuer) {
          validateUrl(issuer, `${prefix}.issuer`);
        }

        const identityClaim = requireString(entry?.identity_claim, `${prefix}.identity_claim`);
        if (identityClaim && !/^[A-Za-z]{3}$/.test(identityClaim)) {
          errors.push(`${prefix}.identity_claim: Must be exactly 3 letters`);
        }

        if (!Array.isArray(entry?.identity_value) || entry.identity_value.length === 0) {
          errors.push(`${prefix}.identity_value: Provide at least one subject identifier`);
        } else {
          entry.identity_value.forEach((value: unknown, valueIndex: number) => {
            if (typeof value !== 'string' || !value.trim()) {
              errors.push(`${prefix}.identity_value[${valueIndex}]: Value is required`);
            } else {
              validateGuid(value, `${prefix}.identity_value[${valueIndex}]`);
            }
          });
        }
      });
    }

    if (manifest['note-sections']) {
      Object.entries(manifest['note-sections'] as Record<string, unknown>).forEach(([key, value]) => {
        if (value === null) {
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((item, itemIndex) => {
            if (typeof item !== 'string' || !item.trim()) {
              errors.push(`note-sections['${key}'][${itemIndex}]: Must be a non-empty string`);
            }
          });
        } else if (typeof value === 'string') {
          if (!value.trim()) {
            errors.push(`note-sections['${key}']: Must be a non-empty string or array of strings`);
          }
        } else {
          errors.push(`note-sections['${key}']: Must be null, a string, or an array of strings`);
        }
      });
    } else {
      warnings.push('note-sections: Not defined; Dragon Copilot default sections will be used');
    }

    const instance = manifest.instance as PartnerIntegrationManifest['instance'] | undefined;
    if (!instance || typeof instance !== 'object') {
      errors.push('instance: Field is required');
    } else {
      const clientAuthentication = instance['client-authentication'];
      if (!clientAuthentication) {
        errors.push('instance.client-authentication: Field is required');
      } else {
        checkYesNo(clientAuthentication['allow-multiple-issuers'], 'instance.client-authentication.allow-multiple-issuers');

  const issuerFields = clientAuthentication.issuer;
        if (!issuerFields) {
          errors.push('instance.client-authentication.issuer: Field is required');
        } else {
          checkFieldDefinition(issuerFields['access-token-issuer'], 'instance.client-authentication.issuer.access-token-issuer');
          if (issuerFields['user-identity-claim']) {
            checkFieldDefinition(issuerFields['user-identity-claim'], 'instance.client-authentication.issuer.user-identity-claim');
          }
          if (issuerFields['customer-identity-claim']) {
            checkFieldDefinition(issuerFields['customer-identity-claim'], 'instance.client-authentication.issuer.customer-identity-claim');
          }
        }
      }

      const webLaunchSofConfig = instance['web-launch-sof'];
      const tokenConfig = instance['web-launch-token'];

      const hasWebLaunchSof = webLaunchSofConfig !== undefined && webLaunchSofConfig !== null;
      const hasWebLaunchToken = tokenConfig !== undefined && tokenConfig !== null;

      if (!hasWebLaunchSof && !hasWebLaunchToken) {
        errors.push('instance: Configure either web-launch-sof or web-launch-token.');
      }

      if (hasWebLaunchSof) {
        checkFieldDefinition(webLaunchSofConfig, 'instance.web-launch-sof');
      }

      if (hasWebLaunchToken && tokenConfig) {
        checkYesNo(tokenConfig['use-client-authentication'], 'instance.web-launch-token.use-client-authentication', true);
        checkYesNo(tokenConfig['allow-multiple-issuers'], 'instance.web-launch-token.allow-multiple-issuers');

        if (tokenConfig['use-client-authentication'] === 'no') {
          if (!Array.isArray(tokenConfig.issuer) || tokenConfig.issuer.length === 0) {
            errors.push('instance.web-launch-token.issuer: Provide at least one issuer field definition when use-client-authentication is no');
          } else {
            tokenConfig.issuer.forEach((issuerField: unknown, issuerIndex: number) => {
              checkFieldDefinition(issuerField, `instance.web-launch-token.issuer[${issuerIndex}]`, { requireName: true });
            });
          }
        }
      }

  const contextErrors = validateContextItems(instance['context-retrieval']);
      if (contextErrors.length) {
        contextErrors.forEach(error => errors.push(error));
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
  console.log(chalk.gray(`  Partner ID: ${manifest['partner-id']}`));
  console.log(chalk.gray(`  Server authentication issuers: ${manifest['server-authentication']?.length || 0}`));
  console.log(chalk.gray(`  Note sections configured: ${Object.keys(manifest['note-sections'] ?? {}).length}`));
  console.log(chalk.gray(`  Context retrieval items: ${manifest.instance?.['context-retrieval']?.instance?.length || 0}`));
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