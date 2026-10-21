import { input, select, checkbox, confirm } from '@inquirer/prompts';
import type {
  DragonExtensionManifest,
  AuthConfig,
  DragonInputV030,
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
  /** Fully built 0.3.0 inputs; when present these take precedence over inputTypes/ehrInclude. */
  inputs?: DragonInputV030[];
  outputs: OutputDetails[];
}

export interface OutputDetails {
  name: string;
  description: string;
  'content-type': string;
}

export const EHR_CONTEXT_CONTENT_TYPE = 'application/fhir.ehr-context+json';
export const ADAPTIVE_CARD_CONTENT_TYPE = 'application/vnd.ms-dragon.adaptivecard-content+json';
export const SUPPLEMENTAL_EHR_CONTEXT_INPUT_NAME = 'supplemental-context';

export const INPUT_TYPE_CHOICES = [
  { name: 'Clinical Note (DSP/Note)', value: 'application/vnd.ms-dragon.dsp.note+json' },
  { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'application/vnd.ms-dragon.dsp.iterative-transcript+json' },
  { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'application/vnd.ms-dragon.dsp.iterative-audio+json' },
  { name: 'Transcript (DSP/Transcript)', value: 'application/vnd.ms-dragon.dsp.transcript+json' },
];

const V030_INPUT_CHOICES = [
  { name: 'EHR Context (FHIR Bundle)', value: EHR_CONTEXT_CONTENT_TYPE },
  { name: 'Adaptive Card Content (card payload and executed action)', value: ADAPTIVE_CARD_CONTENT_TYPE },
];

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
 * Timeout the tooling writes into 0.3.0+ tools. The platform falls back to 5 seconds when the field
 * is omitted, which is too short for most model-backed tools, so it is always written explicitly.
 */
export const DEFAULT_TOOL_TIMEOUT_SECONDS = 60;

/**
 * Validates an optional tool timeout (whole seconds, 3-60). Empty means "use the default".
 */
export function validateTimeout(input: string): string | boolean {
  if (!input.trim()) return true;
  const value = Number(input.trim());
  if (!Number.isInteger(value) || value < 3 || value > 60) {
    return `Timeout must be a whole number of seconds between 3 and 60 (default ${DEFAULT_TOOL_TIMEOUT_SECONDS})`;
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
      message: 'Timeout in seconds (3-60):',
      default: String(DEFAULT_TOOL_TIMEOUT_SECONDS),
      validate: validateTimeout
    });
    timeout = timeoutInput.trim() ? Number(timeoutInput.trim()) : DEFAULT_TOOL_TIMEOUT_SECONDS;
  }

  const inputChoices = legacy ? INPUT_TYPE_CHOICES : [...INPUT_TYPE_CHOICES, ...V030_INPUT_CHOICES];
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
    ehrInclude = await promptEhrInclude('Which EHR context sections does the tool need?');
  }

  let inputs: DragonInputV030[] | undefined;
  let outputs: OutputDetails[];
  if (legacy) {
    outputs = await promptOutputs();
  } else {
    inputs = await promptV030Inputs(inputTypes, ehrInclude ?? [], triggers ?? []);
    const returnsOutput = await confirm({
      message: 'Does this tool return results (adaptive cards) to Dragon Copilot? (No = fire-and-forget)',
      default: true
    });
    outputs = returnsOutput ? await promptOutputs() : [];
  }

  return {
    toolName,
    toolDescription,
    endpoint,
    inputTypes,
    outputs,
    ...(caption !== undefined ? { caption } : {}),
    ...(triggers !== undefined ? { triggers } : {}),
    ...(timeout !== undefined ? { timeout } : {}),
    ...(ehrInclude !== undefined ? { ehrInclude } : {}),
    ...(inputs !== undefined ? { inputs } : {})
  };
}

async function promptEhrInclude(message: string): Promise<EhrContextSelector[]> {
  return checkbox({
    message,
    choices: EHR_INCLUDE_CHOICES.map(value => ({ name: value, value })),
    validate: (choices) => (choices.length === 0 ? 'Please select at least one EHR context section' : true)
  });
}

/**
 * Builds 0.3.0 inputs from the selected content types, offering an optional supplemental EHR
 * context input and letting the author mark inputs as optional (`required: false`).
 */
async function promptV030Inputs(
  inputTypes: string[],
  ehrInclude: EhrContextSelector[],
  triggers: ToolTrigger[]
): Promise<DragonInputV030[]> {
  const inputs = buildV030Inputs(inputTypes, ehrInclude);

  if (inputTypes.includes(EHR_CONTEXT_CONTENT_TYPE)) {
    const addSupplemental = await confirm({
      message: 'Add an optional supplemental EHR context input? (the tool still runs when that context is unavailable)',
      default: false
    });
    if (addSupplemental) {
      const include = await promptEhrInclude('Which EHR context sections are optional?');
      inputs.push({
        name: SUPPLEMENTAL_EHR_CONTEXT_INPUT_NAME,
        description: 'Optional supplemental EHR context',
        'content-type': EHR_CONTEXT_CONTENT_TYPE,
        include,
        required: false
      });
    }
  }

  const candidates = inputs.filter(item => item.required !== false);
  if (candidates.length > 1) {
    // Card content only arrives on card actions, so it must be optional for DataAvailable runs to happen.
    const cardContentOptionalByDefault = triggers.includes('DataAvailable');
    const optionalNames = await checkbox({
      message: 'Which inputs are optional? (the tool is invoked even when they are unavailable)',
      choices: candidates.map(item => ({
        name: `${item.name} (${item['content-type']})`,
        value: item.name,
        checked: cardContentOptionalByDefault && item['content-type'] === ADAPTIVE_CARD_CONTENT_TYPE
      })),
      validate: (choices) => (choices.length === candidates.length ? 'At least one input must stay required' : true)
    });
    for (const item of inputs) {
      if (optionalNames.includes(item.name)) {
        item.required = false;
      }
    }
  }

  return inputs;
}

/**
 * Maps selected content types to 0.3.0 input definitions (all required).
 */
export function buildV030Inputs(inputTypes: string[], ehrInclude: EhrContextSelector[] = []): DragonInputV030[] {
  return inputTypes.map((contentType, index): DragonInputV030 => ({
    name: getInputName(contentType, index),
    description: getInputDescription(contentType),
    'content-type': contentType,
    ...(contentType === EHR_CONTEXT_CONTENT_TYPE ? { include: ehrInclude.length > 0 ? ehrInclude : ['patient'] } : {})
  }));
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
    case ADAPTIVE_CARD_CONTENT_TYPE:
      return 'Adaptive card payload and details of the executed action';
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
    case ADAPTIVE_CARD_CONTENT_TYPE:
      return 'card-content';
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
