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
}

export interface ToolDetails {
  toolName: string;
  toolDescription: string;
  toolType: 'contractBased' | 'uiBased' | 'mcpBased' | 'agentBased';
  capability: 'qualityCheck';
  endpoint: string;
  inputTypes: string[];
  outputs: DcrOutput[];
  relevanceFilteringCriteria?: RelevanceFilteringCriteria | undefined;
}

export const INPUT_TYPE_CHOICES = [
  { name: 'Radiology Report (DSP/Rad/Report)', value: 'application/vnd.ms-dragon.dsp.rad.report+json' },
  { name: 'Patient Info (DSP/Rad/PatientInfo)', value: 'application/vnd.ms-dragon.dsp.rad.patient-info+json' },
];

export const TOOL_TYPE_CHOICES = [
  { name: 'Contract Based', value: 'contractBased' as const },
  { name: 'UI Based', value: 'uiBased' as const },
  { name: 'MCP Based', value: 'mcpBased' as const },
  { name: 'Agent Based', value: 'agentBased' as const },
];

export const CAPABILITY_CHOICES = [
  { name: 'Quality Check', value: 'qualityCheck' as const },
];

/**
 * Validates tool name input
 */
export function validateToolName(input: string, existingManifest?: DcrExtensionManifest | null): string | boolean {
  if (!input.trim()) return 'Tool name is required';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input)) {
        return 'Tool name must use lowercase kebab-case segments (letters/numbers separated by single hyphens)';
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
    default: defaults?.name || 'my-radiology-extension',
    validate: validateExtensionName
  });

  const description = await input({
    message: 'Extension description:',
    default: defaults?.description || 'A Dragon Copilot radiology extension'
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
    case 'application/vnd.ms-dragon.dsp.rad.report+json':
      return 'Radiology report from Dragon Copilot';
    case 'application/vnd.ms-dragon.dsp.rad.patient-info+json':
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
    case 'application/vnd.ms-dragon.dsp.rad.report+json':
      return 'report';
    case 'application/vnd.ms-dragon.dsp.rad.patient-info+json':
      return 'patient-info';
    default:
      return `input-${index + 1}`;
  }
}

/**
 * Prompts for output details
 */
export async function promptOutputDetails(defaults?: { name?: string; description?: string }): Promise<DcrOutput> {
  const name = await input({
    message: 'Output name:',
    default: defaults?.name || 'quality-result'
  });

  const description = await input({
    message: 'Output description:',
    default: defaults?.description || 'Quality check result'
  });

  return {
    name,
    description,
    'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json'
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
  console.log('\n?? Configuring relevance filtering criteria for your tool...');

  const relevantBodyParts = await checkbox({
    message: 'Select relevant body parts:',
    choices: BODY_PART_CHOICES,
    validate: (choices) => {
      if (choices.length === 0) return 'Please select at least one body part';
      return true;
    }
  });

  const relevantModalities = await checkbox({
    message: 'Select relevant imaging modalities:',
    choices: MODALITY_CHOICES,
    validate: (choices) => {
      if (choices.length === 0) return 'Please select at least one modality';
      return true;
    }
  });

  return { relevantBodyParts, relevantModalities };
}

/**
 * Prompts for multiple outputs
 */
export async function promptOutputs(): Promise<DcrOutput[]> {
  const outputs: DcrOutput[] = [];

  console.log('\n?? Configuring outputs for your tool...');

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
