import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { DragonExtensionManifest, PublisherConfig, AuthConfig } from '../types.js';
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
  trigger?: 'AutoRun' | 'AdaptiveCardAction';
  inputTypes: string[];
  outputs: OutputDetails[];
}

export interface OutputDetails {
  name: string;
  description: string;
  data?: string; // Deprecated
  'content-type'?: string;
}

export const INPUT_TYPE_CHOICES = [
  { name: 'Clinical Note (DSP/Note)', value: 'DSP/Note', contentType: 'application/vnd.ms-dragon.dsp.note+json' },
  { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'DSP/IterativeTranscript', contentType: 'application/vnd.ms-dragon.dsp.iterative-transcript+json' },
  { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'DSP/IterativeAudio', contentType: 'application/vnd.ms-dragon.dsp.iterative-audio+json' },
  { name: 'Transcript (DSP/Transcript)', value: 'DSP/Transcript', contentType: 'application/vnd.ms-dragon.dsp.transcript+json' },
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
 * Gets content-type from legacy data type
 */
export function getContentTypeFromDataType(dataType: string): string {
  const choice = INPUT_TYPE_CHOICES.find(c => c.value === dataType);
  return choice?.contentType || 'application/vnd.ms-dragon.dsp+json';
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
    'content-type': 'application/vnd.ms-dragon.dsp+json'
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
export async function promptPublisherDetails(defaults?: Partial<PublisherConfig>): Promise<PublisherConfig> {
  const publisherId = await input({
    message: 'Publisher ID (e.g., contoso.healthcare):',
    default: defaults?.publisherId || 'contoso.healthcare',
    validate: validatePublisherId
  });

  const publisherName = await input({
    message: 'Publisher Name:',
    default: defaults?.publisherName || 'Contoso Healthcare Inc.'
  });

  const websiteUrl = await input({
    message: 'Website URL:',
    default: defaults?.websiteUrl || 'https://www.contosohealth.com',
    validate: validateUrl
  });

  const privacyPolicyUrl = await input({
    message: 'Privacy Policy URL:',
    default: defaults?.privacyPolicyUrl || 'https://www.contosohealth.com/privacy',
    validate: validateUrl
  });

  const supportUrl = await input({
    message: 'Support URL:',
    default: defaults?.supportUrl || 'https://www.contosohealth.com/support',
    validate: validateUrl
  });

  const version = await input({
    message: 'Publisher Config Version:',
    default: defaults?.version || '0.0.1',
    validate: validateVersion
  });

  const contactEmail = await input({
    message: 'Contact Email:',
    default: defaults?.contactEmail || 'support@contosohealth.com',
    validate: validateEmail
  });

  const offerId = await input({
    message: 'Offer ID:',
    default: defaults?.offerId || 'contoso-extension-suite'
  });

  // Fixed values as per requirements - only US and en-US supported
  const defaultLocale = 'en-US';
  const supportedLocales = ['en-US'];
  const regions = ['US'];
  const scope = 'Workflow'; // Fixed scope as per requirements

  return {
    publisherId,
    publisherName,
    websiteUrl,
    privacyPolicyUrl,
    supportUrl,
    version,
    contactEmail,
    offerId,
    scope,
    defaultLocale,
    supportedLocales,
    regions
  };
}
