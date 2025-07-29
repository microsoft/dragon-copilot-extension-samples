import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { DragonExtensionManifest, PublisherConfig, DragonConfiguration } from '../types.js';
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
  includeAdaptiveCard?: boolean;
}

export const INPUT_TYPE_CHOICES = [
  { name: 'Clinical Note (DSP/Note)', value: 'DSP/Note' },
  { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'DSP/IterativeTranscript' },
  { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'DSP/IterativeAudio' },
  { name: 'Transcript (DSP/Transcript)', value: 'DSP/Transcript' },
];

/**
 * Validates configuration label using schema
 */
export function validateConfigLabel(input: string): string | boolean {
  return validateFieldValue(input, 'DragonConfiguration.label', 'manifest');
}

/**
 * Validates configuration description using schema
 */
export function validateConfigDescription(input: string): string | boolean {
  return validateFieldValue(input, 'DragonConfiguration.description', 'manifest');
}

/**
 * Validates header name using schema
 */
export function validateHeaderName(input: string): string | boolean {
  return validateFieldValue(input, 'DragonConfiguration.header', 'manifest');
}

/**
 * Prompts for a single configuration item
 */
export async function promptConfigurationItem(existingConfigs?: DragonConfiguration[]): Promise<DragonConfiguration> {
  const label = await input({
    message: 'Configuration label (shown during installation):',
    validate: validateConfigLabel
  });

  const description = await input({
    message: 'Configuration description (help text for users):',
    validate: validateConfigDescription
  });

  const header = await input({
    message: 'Header name (must start with "x-dre-"):',
    default: `x-dre-${label.toLowerCase().replace(/\s+/g, '-')}`,
    validate: (input: string) => {
      const baseValidation = validateHeaderName(input);
      if (baseValidation !== true) return baseValidation;

      if (existingConfigs?.find(c => c.header === input)) {
        return 'Header name already exists in this extension';
      }
      return true;
    }
  });

  return { label, description, header };
}

/**
 * Prompts for extension configuration
 */
export async function promptExtensionConfiguration(): Promise<DragonConfiguration[]> {
  const configurations: DragonConfiguration[] = [];

  const addConfiguration = await confirm({
    message: 'Add configuration values for this extension?',
    default: false
  });

  if (!addConfiguration) {
    return configurations;
  }

  console.log('\n📋 Configuration allows users to provide custom values during installation.');
  console.log('These values are passed as HTTP headers to your extension\'s API endpoints.\n');

  let addMore = true;
  while (addMore) {
    const config = await promptConfigurationItem(configurations);
    configurations.push(config);

    if (configurations.length >= 10) {
      console.log('Maximum of 10 configuration items reached.');
      break;
    }

    addMore = await confirm({
      message: 'Add another configuration item?',
      default: false
    });
  }

  return configurations;
}
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
 * Prompts for tool details with configurable options
 */
export async function promptToolDetails(
  existingManifest?: DragonExtensionManifest | null,
  options?: {
    includeAdaptiveCardPrompt?: boolean;
    allowMultipleInputs?: boolean;
    defaults?: {
      toolName?: string;
      toolDescription?: string;
      endpoint?: string;
    };
  }
): Promise<ToolDetails> {
  const {
    includeAdaptiveCardPrompt = true,
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

  let includeAdaptiveCard = true;
  if (includeAdaptiveCardPrompt) {
    includeAdaptiveCard = await confirm({
      message: 'Include Adaptive Card output?',
      default: true
    });
  }

  return { toolName, toolDescription, endpoint, inputTypes, includeAdaptiveCard };
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
  const countries = ['US'];

  return {
    publisherId,
    publisherName,
    websiteUrl,
    privacyPolicyUrl,
    supportUrl,
    version,
    contactEmail,
    offerId,
    defaultLocale,
    supportedLocales,
    countries
  };
}
