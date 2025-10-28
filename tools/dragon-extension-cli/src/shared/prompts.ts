import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { promptPublisherDetails as promptCommonPublisherDetails } from '@dragon-copilot/cli-common';
import type { DragonExtensionManifest, PublisherConfig, AuthConfig } from '../types.js';
import { validateFieldValue } from './schema-validator.js';

export interface ExtensionDetails {
  name: string;
  description: string;
  version: string;
}

export interface ToolDetails {
  toolName: string;
  toolDescription: string;
  endpoint: string;
  inputTypes: string[];
  outputs: OutputDetails[];
}

export interface OutputDetails {
  name: string;
  description: string;
  data: string;
}

export const INPUT_TYPE_CHOICES = [
  { name: 'Clinical Note (DSP/Note)', value: 'DSP/Note' },
  { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'DSP/IterativeTranscript' },
  { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'DSP/IterativeAudio' },
  { name: 'Transcript (DSP/Transcript)', value: 'DSP/Transcript' },
];

/**
 * Validates tool name input
 */
export function validateToolName(input: string, existingManifest?: DragonExtensionManifest | null): string | boolean {
  if (!input.trim()) return 'Tool name is required';
  if (!/^[a-z0-9-]+$/.test(input)) return 'Tool name must contain only lowercase letters, numbers, and hyphens';
  if (existingManifest?.tools.find(t => t.name === input)) {
    return 'Tool with this name already exists';
  }
  return true;
}

/**
 * Validates extension name input using schema validation
 */
export function validateExtensionName(input: string): string | boolean {
  return validateFieldValue(input, 'name', 'manifest');
}

/**
 * Validates URL input using schema validation
 */
export function validateUrl(input: string): string | boolean {
  return validateFieldValue(input, 'websiteUrl', 'publisher');
}

/**
 * Validates version format using schema validation
 */
export function validateVersion(input: string): string | boolean {
  return validateFieldValue(input, 'version', 'manifest');
}

/**
 * Validates publisher ID input using schema validation
 */
export function validatePublisherId(input: string): string | boolean {
  return validateFieldValue(input, 'publisherId', 'publisher');
}

/**
 * Validates email input using schema validation
 */
export function validateEmail(input: string): string | boolean {
  return validateFieldValue(input, 'contactEmail', 'publisher');
}

/**
 * Validates tenant ID input (GUID format)
 */
export function validateTenantId(input: string): string | boolean {
  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input.trim()) return 'Tenant ID is required';
  if (!guidPattern.test(input.trim())) return 'Tenant ID must be a valid GUID format (e.g., 12345678-1234-1234-1234-123456789abc)';
  return true;
}

/**
 * Prompts for extension details
 */
export async function promptExtensionDetails(defaults?: Partial<ExtensionDetails>): Promise<ExtensionDetails> {
  const name = await input({
    message: 'Extension name:',
    default: defaults?.name || 'my-dragon-extension',
    validate: validateExtensionName
  });

  const description = await input({
    message: 'Extension description:',
    default: defaults?.description || 'A Dragon Copilot extension'
  });

  const version = await input({
    message: 'Version:',
    default: defaults?.version || '0.0.1',
    validate: validateVersion
  });

  return { name, description, version };
}

/**
 * Prompts for authentication details
 */
export async function promptAuthDetails(defaults?: { tenantId?: string }): Promise<{ tenantId: string }> {
  console.log('Authentication configuration is required for Dragon Copilot extensions.');
  console.log('This should be the Azure Entra ID tenant where your extension will be deployed.');

  const tenantId = await input({
    message: 'Azure Entra ID Tenant ID:',
    default: defaults?.tenantId || '',
    validate: validateTenantId
  });

  return { tenantId };
}

/**
 * Prompts for tool details with configurable options
 */
export async function promptToolDetails(
  existingManifest?: DragonExtensionManifest | null,
  options?: {
    allowMultipleInputs?: boolean;
    defaults?: {
      toolName?: string;
      toolDescription?: string;
      endpoint?: string;
    };
  }
): Promise<ToolDetails> {
  const {
    allowMultipleInputs = true,
    defaults = {}
  } = options || {};

  const toolName = await input({
    message: 'Tool name:',
    default: defaults.toolName,
    validate: (input: string) => validateToolName(input, existingManifest)
  });

  const toolDescription = await input({
    message: 'Tool description:',
    default: defaults.toolDescription
  });

  const endpoint = await input({
    message: 'API endpoint:',
    default: defaults.endpoint,
    validate: validateUrl
  });

  const inputTypes = await checkbox({
    message: allowMultipleInputs ? 'Select input data types:' : 'Select primary input data type:',
    choices: INPUT_TYPE_CHOICES,
    validate: (choices) => {
      if (choices.length === 0) return 'Please select at least one input type';
      if (!allowMultipleInputs && choices.length > 1) {
        return 'Please select only one input type';
      }
      return true;
    }
  });

  // Get outputs using the new prompt function
  const outputs = await promptOutputs();

  return { toolName, toolDescription, endpoint, inputTypes, outputs };
}

/**
 * Gets description for a given data type
 */
export function getInputDescription(dataType: string): string {
  switch (dataType) {
    case 'DSP/Note':
      return 'Clinical Note generated by Dragon Copilot';
    case 'DSP/IterativeTranscript':
      return 'Iterative transcript from Dragon Copilot';
    case 'DSP/IterativeAudio':
      return 'Iterative audio from Dragon Copilot';
    case 'DSP/Transcript':
      return 'Complete transcript from Dragon Copilot';
    default:
      return 'Data from Dragon Copilot';
  }
}

/**
 * Prompts for output details
 */
export async function promptOutputDetails(defaults?: { name?: string; description?: string }): Promise<OutputDetails> {
  const name = await input({
    message: 'Output name:',
    default: defaults?.name || 'adaptive-card'
  });

  const description = await input({
    message: 'Output description:',
    default: defaults?.description || 'Adaptive card response'
  });

  return {
    name,
    description,
    data: 'DSP'
  };
}

/**
 * Prompts for multiple outputs
 */
export async function promptOutputs(): Promise<OutputDetails[]> {
  const outputs: OutputDetails[] = [];

  console.log('\n📤 Configuring outputs for your tool...');

  // First output
  const firstOutput = await promptOutputDetails();
  outputs.push(firstOutput);

  // Ask about additional outputs
  let addMoreOutputs = await confirm({
    message: 'Add additional outputs?',
    default: false
  });

  while (addMoreOutputs) {
    const additionalOutput = await promptOutputDetails();
    outputs.push(additionalOutput);

    addMoreOutputs = await confirm({
      message: 'Add another output?',
      default: false
    });
  }

  return outputs;
}

/**
 * Prompts for publisher configuration details
 * Sets fixed values for locale (en-US) and country (US) as per requirements
 */
const EXTENSION_PUBLISHER_DEFAULTS: Partial<PublisherConfig> = {
  publisherId: 'contoso.healthcare',
  publisherName: 'Contoso Healthcare Inc.',
  websiteUrl: 'https://www.contosohealth.com',
  privacyPolicyUrl: 'https://www.contosohealth.com/privacy',
  supportUrl: 'https://www.contosohealth.com/support',
  version: '0.0.1',
  contactEmail: 'support@contosohealth.com',
  offerId: 'contoso-extension-suite',
  scope: 'Workflow',
  defaultLocale: 'en-US',
  supportedLocales: ['en-US'],
  regions: ['US']
};

export async function promptPublisherDetails(defaults?: Partial<PublisherConfig>): Promise<PublisherConfig> {
  const mergedDefaults: Partial<PublisherConfig> = {
    ...EXTENSION_PUBLISHER_DEFAULTS,
    ...defaults
  };

  return promptCommonPublisherDetails({
    defaults: mergedDefaults,
    validators: {
      publisherId: validatePublisherId,
      publisherName: (value: string) => (value.trim() ? true : 'Publisher Name is required'),
      websiteUrl: validateUrl,
      privacyPolicyUrl: validateUrl,
      supportUrl: validateUrl,
      version: validateVersion,
      contactEmail: validateEmail,
      offerId: (value: string) => (value.trim() ? true : 'Offer ID is required')
    },
    scope: mergedDefaults.scope,
    defaultLocale: mergedDefaults.defaultLocale,
    supportedLocales: mergedDefaults.supportedLocales,
    regions: mergedDefaults.regions
  });
}
