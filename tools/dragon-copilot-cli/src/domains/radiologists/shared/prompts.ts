import { input, select, checkbox, confirm } from '@inquirer/prompts';
import type {
  DcrExtensionManifest,
  DcrOutput,
  RelevanceFilteringCriteria
} from '../types.js';
import { validateFieldValue } from './schema-validator.js';

export interface ExtensionDetails {
  name: string;
  description: string;
  version: string;
  radiologistsExtensibilityApiVersion: string;
}

export interface ToolDetails {
  toolName: string;
  toolDescription: string;
  toolType: 'contractBased';
  capability: 'qualityCheck';
  endpoint: string;
  inputTypes: string[];
  outputs: DcrOutput[];
  relevanceFilteringCriteria?: RelevanceFilteringCriteria | undefined;
}

export const INPUT_TYPE_CHOICES = [
  { name: 'Radiology Report', value: 'application/vnd.ms-dragon.rad.report+json' },
  { name: 'Patient Information', value: 'application/vnd.ms-dragon.rad.patient-information+json' },
];

export const TOOL_TYPE_CHOICES = [
  { name: 'Contract Based', value: 'contractBased' as const },
];

export const CAPABILITY_CHOICES = [
  { name: 'Quality Check', value: 'qualityCheck' as const },
];

/**
 * Validates tool name input
 */
export function validateToolName(input: string, existingManifest?: DcrExtensionManifest | null): string | boolean {
  if (!input.trim()) return 'Tool name is required';
    if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
        return 'Tool name must use camelCase (start with a lowercase letter, followed by letters and numbers)';
    }
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
 * Validates the Radiologists Extensibility API version (x.y.z) the manifest was authored against.
 */
export function validateradiologistsExtensibilityApiVersion(input: string): string | boolean {
  return validateFieldValue(input, 'radiologistsExtensibilityApiVersion', 'manifest');
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
    default: defaults?.name || 'myRadiologistsExtension',
    validate: validateExtensionName
  });

  const description = await input({
    message: 'Extension description:',
    default: defaults?.description || 'A Dragon Copilot radiologists extension'
  });

  const version = await input({
    message: 'Version:',
    default: defaults?.version || '0.0.1',
    validate: validateVersion
  });

  const radiologistsExtensibilityApiVersion = await input({
    message: 'Radiologists Extensibility API version this manifest was authored against:',
    default: defaults?.radiologistsExtensibilityApiVersion || '1.0.0',
    validate: validateradiologistsExtensibilityApiVersion
  });

  return { name, description, version, radiologistsExtensibilityApiVersion };
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
  existingManifest?: DcrExtensionManifest | null,
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

  const toolType = await select({
    message: 'Tool type:',
    choices: TOOL_TYPE_CHOICES,
    default: 'contractBased'
  });

  const capability = await select({
    message: 'Capability:',
    choices: CAPABILITY_CHOICES
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

  const outputs = await promptOutputs();

  // Optionally prompt for relevance filtering criteria
  const addFiltering = await confirm({
    message: 'Add relevance filtering criteria (body parts & modalities)?',
    default: false
  });

  let relevanceFilteringCriteria: RelevanceFilteringCriteria | undefined;
  if (addFiltering) {
    relevanceFilteringCriteria = await promptRelevanceFilteringCriteria();
  }

  return { toolName, toolDescription, toolType, capability, endpoint, inputTypes, outputs, relevanceFilteringCriteria };
}

/**
 * Gets description for a given data type
 */
export function getInputDescription(contentType: string): string {
  switch (contentType) {
    case 'application/vnd.ms-dragon.rad.report+json':
      return 'Radiology report from Dragon Copilot';
    case 'application/vnd.ms-dragon.rad.patient-information+json':
      return 'Patient demographic information from Dragon Copilot';
    default:
      return 'Data from Dragon Copilot';
  }
}

/**
 * Maps a content-type to a default input name
 */
export function getInputName(contentType: string, index: number): string {
  switch (contentType) {
    case 'application/vnd.ms-dragon.rad.report+json':
      return 'report';
    case 'application/vnd.ms-dragon.rad.patient-information+json':
      return 'patientInformation';
    default:
      return `input-${index + 1}`;
  }
}

/**
 * Prompts for output details
 */
export async function promptOutputDetails(defaults?: { name?: string; description?: string; schemaVersion?: string }): Promise<DcrOutput> {
  const name = await input({
    message: 'Output name:',
    default: defaults?.name || 'qualityCheckResult'
  });

  const description = await input({
    message: 'Output description:',
    default: defaults?.description || 'Quality check result'
  });

  const schemaVersion = await input({
    message: 'Output payload schemaVersion (major.minor):',
    default: defaults?.schemaVersion || '1.0'
  });

  return {
    name,
    description,
    'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json',
    schemaVersion
  };
}

export const BODY_PART_CHOICES = [
  { name: 'Head', value: 'HEAD' },
  { name: 'Brain', value: 'BRAIN' },
  { name: 'Skull', value: 'SKULL' },
  { name: 'Sinus', value: 'SINUS' },
  { name: 'Neck', value: 'NECK' },
  { name: 'C-Spine', value: 'CSPINE' },
  { name: 'T-Spine', value: 'TSPINE' },
  { name: 'L-Spine', value: 'LSPINE' },
  { name: 'Spine', value: 'SPINE' },
  { name: 'Chest', value: 'CHEST' },
  { name: 'Abdomen', value: 'ABDOMEN' },
  { name: 'Pelvis', value: 'PELVIS' },
  { name: 'Shoulder', value: 'SHOULDER' },
  { name: 'Elbow', value: 'ELBOW' },
  { name: 'Wrist', value: 'WRIST' },
  { name: 'Hand', value: 'HAND' },
  { name: 'Hip', value: 'HIP' },
  { name: 'Knee', value: 'KNEE' },
  { name: 'Ankle', value: 'ANKLE' },
  { name: 'Foot', value: 'FOOT' },
  { name: 'Whole Body', value: 'WHOLEBODY' },
];

export const MODALITY_CHOICES = [
  { name: 'CR - Computed Radiography', value: 'CR' },
  { name: 'CT - Computed Tomography', value: 'CT' },
  { name: 'DX - Digital Radiography', value: 'DX' },
  { name: 'MG - Mammography', value: 'MG' },
  { name: 'MR - MRI', value: 'MR' },
  { name: 'NM - Nuclear Medicine', value: 'NM' },
  { name: 'PT - PET', value: 'PT' },
  { name: 'RF - Fluoroscopy', value: 'RF' },
  { name: 'US - Ultrasound', value: 'US' },
  { name: 'XA - X-ray Angiography', value: 'XA' },
];

/**
 * Prompts for relevance filtering criteria
 */
export async function promptRelevanceFilteringCriteria(): Promise<RelevanceFilteringCriteria> {
  console.log('\n Configuring relevance filtering criteria for your tool...');

  let relevantBodyParts: string[] = [];
  let relevantModalities: string[] = [];

  // At least one of body parts or modalities must be selected; both are individually optional.
  while (relevantBodyParts.length === 0 && relevantModalities.length === 0) {
    relevantBodyParts = await checkbox({
      message: 'Select relevant body parts:',
      choices: BODY_PART_CHOICES,
    });

    relevantModalities = await checkbox({
      message: 'Select relevant imaging modalities:',
      choices: MODALITY_CHOICES,
    });

    if (relevantBodyParts.length === 0 && relevantModalities.length === 0) {
      console.log('Select at least one body part or one modality.');
    }
  }

  const criteria: RelevanceFilteringCriteria = {};
  if (relevantBodyParts.length > 0) {
    criteria.relevantBodyParts = relevantBodyParts;
  }
  if (relevantModalities.length > 0) {
    criteria.relevantModalities = relevantModalities;
  }
  return criteria;
}

/**
 * Prompts for multiple outputs
 */
export async function promptOutputs(): Promise<DcrOutput[]> {
  const outputs: DcrOutput[] = [];

  console.log('\n Configuring outputs for your tool...');

  const firstOutput = await promptOutputDetails();
  outputs.push(firstOutput);

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
