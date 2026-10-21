import { input, select, checkbox, confirm } from '@inquirer/prompts';
import type {
  DragonExtensionManifest,
  AuthConfig,
  EhrContextSelector,
  ToolTrigger
} from '../types.js';
import { validateFieldValue, LEGACY_SCHEMA_VERSION, LATEST_SCHEMA_VERSION } from './schema-validator.js';

export interface ExtensionDetails {
  name: string;
  caption?: string;
  description: string;
  version: string;
}

export interface ToolDetails {
  toolName: string;
  caption?: string;
  toolDescription: string;
  endpoint: string;
  trigger?: 'AutoRun' | 'AdaptiveCardAction';
  triggers?: ToolTrigger[];
  timeout?: number;
  inputTypes: string[];
  ehrInclude?: EhrContextSelector[];
  outputs: OutputDetails[];
}

export interface OutputDetails {
  name: string;
  description: string;
  'content-type': string;
}

export const EHR_CONTEXT_CONTENT_TYPE = 'application/fhir.ehr-context+json';

export const INPUT_TYPE_CHOICES = [
  { name: 'Clinical Note (DSP/Note)', value: 'application/vnd.ms-dragon.dsp.note+json' },
  { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'application/vnd.ms-dragon.dsp.iterative-transcript+json' },
  { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'application/vnd.ms-dragon.dsp.iterative-audio+json' },
  { name: 'Transcript (DSP/Transcript)', value: 'application/vnd.ms-dragon.dsp.transcript+json' },
];

const EHR_CONTEXT_INPUT_CHOICE = { name: 'EHR Context (FHIR Bundle)', value: EHR_CONTEXT_CONTENT_TYPE };

export const TRIGGER_CHOICES: Array<{ name: string; value: ToolTrigger }> = [
  { name: 'DataAvailable - run automatically when all required inputs are available', value: 'DataAvailable' },
  { name: 'ExplicitRequest - run only on a deliberate user action', value: 'ExplicitRequest' },
];

export const EHR_INCLUDE_CHOICES: EhrContextSelector[] = [
  'provider',
  'patient',
  'current-encounter',
  'problem-list',
  'current-encounter-diagnoses',
  'reason-for-visit',
  'conditions',
];

export function isLegacySchema(schemaVersion: string): boolean {
  return schemaVersion === LEGACY_SCHEMA_VERSION;
}

/**
 * Builds a display caption from a kebab-case name, e.g. `note-analyzer` -> `Note Analyzer`.
 */
export function humanizeName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Validates tool name input
 */
export function validateToolName(
  input: string,
  existingManifest?: DragonExtensionManifest | null,
  schemaVersion: string = LATEST_SCHEMA_VERSION
): string | boolean {
  if (!input.trim()) return 'Tool name is required';
  if (isLegacySchema(schemaVersion)) {
    if (!/^[a-z0-9-]+$/.test(input)) return 'Tool name must contain only lowercase letters, numbers, and hyphens';
  } else if (validateFieldValue(input, 'definitions.Tool.properties.name', 'manifest', schemaVersion) !== true) {
    return 'Tool name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens';
  }
  const existingTools = (existingManifest?.tools ?? []) as Array<{ name: string }>;
  if (existingTools.find(t => t.name === input)) {
    return 'Tool with this name already exists';
  }
  return true;
}

/**
 * Validates extension name input using schema validation
 */
export function validateExtensionName(input: string, schemaVersion: string = LATEST_SCHEMA_VERSION): string | boolean {
  return validateFieldValue(input, 'name', 'manifest', schemaVersion);
}

/**
 * Validates an optional tool timeout (whole seconds, 3-60). Empty means "use the default".
 */
export function validateTimeout(input: string): string | boolean {
  if (!input.trim()) return true;
  const value = Number(input.trim());
  if (!Number.isInteger(value) || value < 3 || value > 60) {
    return 'Timeout must be a whole number of seconds between 3 and 60 (leave empty for the default of 5)';
  }
  return true;
}

/**
 * Validates URL input
 */
export function validateUrl(input: string): string | boolean {
  if (!input.trim()) return 'URL is required';
  try {
    new URL(input.trim());
    return true;
  } catch {
    return 'Must be a valid URL (e.g., https://example.com)';
  }
}

/**
 * Validates version format using schema validation
 */
export function validateVersion(input: string): string | boolean {
  return validateFieldValue(input, 'version', 'manifest');
}

/**
 * Validates publisher ID input
 */
export function validatePublisherId(input: string): string | boolean {
  if (!input.trim()) return 'Publisher ID is required';
  return true;
}

/**
 * Validates email input
 */
export function validateEmail(input: string): string | boolean {
  if (!input.trim()) return 'Email is required';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input.trim())) return 'Must be a valid email address';
  return true;
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
export async function promptExtensionDetails(
  defaults?: Partial<ExtensionDetails>,
  schemaVersion: string = LATEST_SCHEMA_VERSION
): Promise<ExtensionDetails> {
  const name = await input({
    message: 'Extension name:',
    default: defaults?.name || 'my-dragon-extension',
    validate: (value: string) => validateExtensionName(value, schemaVersion)
  });

  const caption = isLegacySchema(schemaVersion)
    ? undefined
    : await promptCaption('Extension caption (display name):', defaults?.caption || humanizeName(name));

  const description = await input({
    message: 'Extension description:',
    default: defaults?.description || 'A Dragon Copilot extension'
  });

  const version = await input({
    message: 'Version:',
    default: defaults?.version || '0.0.1',
    validate: validateVersion
  });

  return caption === undefined ? { name, description, version } : { name, caption, description, version };
}

async function promptCaption(message: string, defaultValue: string): Promise<string> {
  return input({
    message,
    default: defaultValue,
    validate: (value: string) => (value.trim() ? true : 'Caption is required')
  });
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
    schemaVersion?: string;
    defaults?: {
      toolName?: string;
      toolDescription?: string;
      endpoint?: string;
    };
  }
): Promise<ToolDetails> {
  const {
    allowMultipleInputs = true,
    schemaVersion = LATEST_SCHEMA_VERSION,
    defaults = {}
  } = options || {};
  const legacy = isLegacySchema(schemaVersion);

  const toolName = await input({
    message: 'Tool name:',
    ...(defaults.toolName ? { default: defaults.toolName } : {}),
    validate: (input: string) => validateToolName(input, existingManifest, schemaVersion)
  });

  const caption = legacy ? undefined : await promptCaption('Tool caption (display name):', humanizeName(toolName));

  const toolDescription = await input({
    message: 'Tool description:',
    ...(defaults.toolDescription ? { default: defaults.toolDescription } : {})
  });

  const endpoint = await input({
    message: 'API endpoint:',
    ...(defaults.endpoint ? { default: defaults.endpoint } : {}),
    validate: validateUrl
  });

  let triggers: ToolTrigger[] | undefined;
  let timeout: number | undefined;
  if (!legacy) {
    triggers = await checkbox({
      message: 'When should this tool run?',
      choices: TRIGGER_CHOICES.map(choice => ({ ...choice, checked: choice.value === 'DataAvailable' })),
      validate: (choices) => (choices.length === 0 ? 'Please select at least one trigger' : true)
    });

    const timeoutInput = await input({
      message: 'Timeout in seconds (3-60, leave empty for the default of 5):',
      default: '',
      validate: validateTimeout
    });
    if (timeoutInput.trim()) {
      timeout = Number(timeoutInput.trim());
    }
  }

  const inputChoices = legacy ? INPUT_TYPE_CHOICES : [...INPUT_TYPE_CHOICES, EHR_CONTEXT_INPUT_CHOICE];
  const inputTypes = await checkbox({
    message: allowMultipleInputs ? 'Select input data types:' : 'Select primary input data type:',
    choices: inputChoices,
    validate: (choices) => {
      if (choices.length === 0) return 'Please select at least one input type';
      if (!allowMultipleInputs && choices.length > 1) {
        return 'Please select only one input type';
      }
      return true;
    }
  });

  let ehrInclude: EhrContextSelector[] | undefined;
  if (inputTypes.includes(EHR_CONTEXT_CONTENT_TYPE)) {
    ehrInclude = await checkbox({
      message: 'Which EHR context sections does the tool need?',
      choices: EHR_INCLUDE_CHOICES.map(value => ({ name: value, value })),
      validate: (choices) => (choices.length === 0 ? 'Please select at least one EHR context section' : true)
    });
  }

  const outputs = await promptOutputs();

  return {
    toolName,
    toolDescription,
    endpoint,
    inputTypes,
    outputs,
    ...(caption !== undefined ? { caption } : {}),
    ...(triggers !== undefined ? { triggers } : {}),
    ...(timeout !== undefined ? { timeout } : {}),
    ...(ehrInclude !== undefined ? { ehrInclude } : {})
  };
}

/**
 * Gets description for a given data type
 */
export function getInputDescription(contentType: string): string {
  switch (contentType) {
    case 'application/vnd.ms-dragon.dsp.note+json':
      return 'Clinical Note generated by Dragon Copilot';
    case 'application/vnd.ms-dragon.dsp.iterative-transcript+json':
      return 'Iterative transcript from Dragon Copilot';
    case 'application/vnd.ms-dragon.dsp.iterative-audio+json':
      return 'Iterative audio from Dragon Copilot';
    case 'application/vnd.ms-dragon.dsp.transcript+json':
      return 'Complete transcript from Dragon Copilot';
    case EHR_CONTEXT_CONTENT_TYPE:
      return 'EHR context for the current encounter';
    default:
      return 'Data from Dragon Copilot';
  }
}

/**
 * Maps a content-type to a default input name
 */
export function getInputName(contentType: string, index: number): string {
  switch (contentType) {
    case 'application/vnd.ms-dragon.dsp.note+json':
      return 'note';
    case 'application/vnd.ms-dragon.dsp.iterative-transcript+json':
      return 'iterative-transcript';
    case 'application/vnd.ms-dragon.dsp.iterative-audio+json':
      return 'iterative-audio';
    case 'application/vnd.ms-dragon.dsp.transcript+json':
      return 'transcript';
    case EHR_CONTEXT_CONTENT_TYPE:
      return 'ehr-context';
    default:
      return `input-${index + 1}`;
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
