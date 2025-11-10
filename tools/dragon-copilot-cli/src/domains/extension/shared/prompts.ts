import { input, select, checkbox, confirm } from '@inquirer/prompts';
import {
  promptPublisherDetails as promptCommonPublisherDetails,
  type PublisherPromptOptions
} from '../../../common/index.js';
import type {
  DragonExtensionManifest,
  PublisherConfig,
  AuthConfig,
  AutomationScript,
  EventTrigger,
  Dependency
} from '../types.js';
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

export interface AutomationScriptDetails {
  name: string;
  description?: string;
  entryPoint: string;
  runtime: string;
  timeoutSeconds?: number;
}

export interface EventTriggerDetails {
  name: string;
  description?: string;
  eventType: string;
  conditions?: string[];
  scriptName: string;
}

export interface DependencyDetails {
  name: string;
  version: string;
  type?: 'extension' | 'service' | 'package';
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

export function validateAutomationScriptName(input: string, existingScripts: AutomationScript[] = []): string | boolean {
  if (!input.trim()) return 'Script name is required';
  if (!/^[a-z0-9-]+$/.test(input)) return 'Script name must contain only lowercase letters, numbers, and hyphens';
  if (existingScripts.some(script => script.name === input.trim())) {
    return 'Script with this name already exists';
  }
  return true;
}

export function validateEventTriggerName(input: string, existingTriggers: EventTrigger[] = []): string | boolean {
  if (!input.trim()) return 'Event trigger name is required';
  if (!/^[a-z0-9-]+$/.test(input)) return 'Event trigger name must contain only lowercase letters, numbers, and hyphens';
  if (existingTriggers.some(trigger => trigger.name === input.trim())) {
    return 'Event trigger with this name already exists';
  }
  return true;
}

export function validateDependencyVersion(input: string): string | boolean {
  if (!input.trim()) return 'Version is required';
  const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/;
  if (!semverPattern.test(input.trim())) {
    return 'Version must follow semantic versioning (e.g. 1.0.0)';
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
    ...(defaults.toolName ? { default: defaults.toolName } : {}),
    validate: (input: string) => validateToolName(input, existingManifest)
  });

  const toolDescription = await input({
    message: 'Tool description:',
    ...(defaults.toolDescription ? { default: defaults.toolDescription } : {})
  });

  const endpoint = await input({
    message: 'API endpoint:',
    ...(defaults.endpoint ? { default: defaults.endpoint } : {}),
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

export async function promptAutomationScriptDetails(
  existingScripts: AutomationScript[]
): Promise<AutomationScriptDetails> {
  const name = await input({
    message: 'Script name:',
    default: existingScripts.length === 0 ? 'process-note' : `automation-script-${existingScripts.length + 1}`,
    validate: (value: string) => validateAutomationScriptName(value, existingScripts)
  });

  const description = await input({
    message: 'Script description (optional):',
    ...(existingScripts.length === 0 ? { default: 'Handles automation logic for the extension' } : {})
  });

  const entryPoint = await input({
    message: 'Script entry point (relative path):',
    default: `scripts/${name}/index.js`,
    validate: (value: string) => (value.trim() ? true : 'Entry point is required')
  });

  const runtime = await select({
    message: 'Runtime environment:',
    choices: [
      { name: 'Node.js 18', value: 'nodejs18' },
      { name: 'Python 3.11', value: 'python3.11' },
      { name: '.NET 8 (C#)', value: 'dotnet8' }
    ],
    default: 'nodejs18'
  });

  const includeTimeout = await confirm({
    message: 'Specify a timeout (in seconds)?',
    default: false
  });

  let timeoutSeconds: number | undefined;
  if (includeTimeout) {
    const timeoutInput = await input({
      message: 'Timeout (seconds):',
      default: '120',
      validate: (value: string) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          return 'Timeout must be a positive integer';
        }
        return true;
      }
    });
    timeoutSeconds = Number.parseInt(timeoutInput, 10);
  }

  const result: AutomationScriptDetails = {
    name,
    entryPoint,
    runtime
  };

  if (description?.trim()) {
    result.description = description.trim();
  }

  if (typeof timeoutSeconds === 'number') {
    result.timeoutSeconds = timeoutSeconds;
  }

  return result;
}

export async function promptEventTriggerDetails(
  existingTriggers: EventTrigger[],
  availableScripts: AutomationScript[]
): Promise<EventTriggerDetails> {
  const name = await input({
    message: 'Event trigger name:',
    default: existingTriggers.length === 0 ? 'note-created' : `event-trigger-${existingTriggers.length + 1}`,
    validate: (value: string) => validateEventTriggerName(value, existingTriggers)
  });

  const description = await input({
    message: 'Event trigger description (optional):',
    ...(existingTriggers.length === 0 ? { default: 'Runs automation when the event occurs' } : {})
  });

  const eventType = await input({
    message: 'Event type:',
    ...(existingTriggers.length === 0 ? { default: 'note.created' } : {}),
    validate: (value: string) => (value.trim() ? true : 'Event type is required')
  });

  const scriptName = await select({
    message: 'Automation script to execute:',
    choices: availableScripts.map(script => ({ name: script.name, value: script.name })),
    default: availableScripts[0]?.name
  });

  const conditions: string[] = [];
  let addCondition = await confirm({
    message: 'Add a trigger condition?',
    default: false
  });

  while (addCondition) {
    const conditionValue = await input({
      message: 'Condition expression:',
      validate: (value: string) => (value.trim() ? true : 'Condition cannot be empty')
    });
    conditions.push(conditionValue);

    addCondition = await confirm({
      message: 'Add another condition?',
      default: false
    });
  }

  const trigger: EventTriggerDetails = {
    name,
    eventType,
    scriptName
  };

  if (description?.trim()) {
    trigger.description = description.trim();
  }

  if (conditions.length > 0) {
    trigger.conditions = conditions;
  }

  return trigger;
}

export async function promptDependencyDetails(
  existingDependencies: Dependency[]
): Promise<DependencyDetails> {
  const name = await input({
    message: 'Dependency name:',
    ...(existingDependencies.length === 0 ? { default: 'clinical-knowledge-service' } : {}),
    validate: (value: string) => (value.trim() ? true : 'Dependency name is required')
  });

  const version = await input({
    message: 'Minimum version:',
    default: '1.0.0',
    validate: validateDependencyVersion
  });

  const specifyType = await confirm({
    message: 'Specify dependency type?',
    default: false
  });

  let type: 'extension' | 'service' | 'package' | undefined;
  if (specifyType) {
    type = await select({
      message: 'Dependency type:',
      choices: [
        { name: 'Extension', value: 'extension' },
        { name: 'Service', value: 'service' },
        { name: 'Package', value: 'package' }
      ]
    });
  }

  const dependency: DependencyDetails = {
    name,
    version
  };

  if (type) {
    dependency.type = type;
  }

  return dependency;
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

  const promptOptions: PublisherPromptOptions = {
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
    }
  };

  if (mergedDefaults.scope) {
    promptOptions.scope = mergedDefaults.scope;
  }

  if (mergedDefaults.defaultLocale) {
    promptOptions.defaultLocale = mergedDefaults.defaultLocale;
  }

  if (mergedDefaults.supportedLocales) {
    promptOptions.supportedLocales = mergedDefaults.supportedLocales;
  }

  if (mergedDefaults.regions) {
    promptOptions.regions = mergedDefaults.regions;
  }

  return promptCommonPublisherDetails(promptOptions);
}
