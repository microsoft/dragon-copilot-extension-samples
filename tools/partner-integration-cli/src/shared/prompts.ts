import { input, select, checkbox, confirm } from '@inquirer/prompts';
import { PartnerIntegrationManifest, PublisherConfig, AuthConfig, PartnerDataType, IntegrationDetails, ToolDetails, PartnerOutput } from '../types.js';
// import { validateFieldValue } from './schema-validator.js';

export interface OutputDetails {
  name: string;
  description: string;
  data: string;
}

export const PARTNER_INPUT_TYPE_CHOICES = [
  { name: 'Clinical Note (DSP/Note)', value: 'DSP/Note' },
  { name: 'Iterative Transcript (DSP/IterativeTranscript)', value: 'DSP/IterativeTranscript' },
  { name: 'Iterative Audio (DSP/IterativeAudio)', value: 'DSP/IterativeAudio' },
  { name: 'Transcript (DSP/Transcript)', value: 'DSP/Transcript' },
  { name: 'Patient Data (DSP/Patient)', value: 'DSP/Patient' },
  { name: 'Encounter Data (DSP/Encounter)', value: 'DSP/Encounter' },
  { name: 'Practitioner Data (DSP/Practitioner)', value: 'DSP/Practitioner' },
  { name: 'Visit Data (DSP/Visit)', value: 'DSP/Visit' },
  { name: 'Medical Code (DSP/MedicalCode)', value: 'DSP/MedicalCode' },
  { name: 'Document (DSP/Document)', value: 'DSP/Document' },
  { name: 'EHR Patient Record (EHR/PatientRecord)', value: 'EHR/PatientRecord' },
  { name: 'EHR Appointment (EHR/Appointment)', value: 'EHR/Appointment' },
  { name: 'EHR Medication (EHR/Medication)', value: 'EHR/Medication' },
  { name: 'EHR Lab Result (EHR/LabResult)', value: 'EHR/LabResult' },
  { name: 'API Response (API/Response)', value: 'API/Response' },
  { name: 'API Request (API/Request)', value: 'API/Request' },
  { name: 'Custom Data (Custom/Data)', value: 'Custom/Data' },
  { name: 'Generic DSP Data (DSP)', value: 'DSP' }
];

/**
 * Validates tool name input
 */
export function validateToolName(input: string, existingManifest?: PartnerIntegrationManifest | null): string | boolean {
  if (!input.trim()) return 'Tool name is required';
  if (!/^[a-z0-9-]+$/.test(input)) return 'Tool name must contain only lowercase letters, numbers, and hyphens';
  if (existingManifest?.tools.find(t => t.name === input)) {
    return 'Tool with this name already exists';
  }
  return true;
}

/**
 * Validates integration name input
 */
export function validateIntegrationName(input: string): string | boolean {
  if (!input.trim()) return 'Integration name is required';
  if (input.length < 3) return 'Integration name must be at least 3 characters long';
  if (input.length > 50) return 'Integration name must be less than 50 characters';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\s\-_.]*[a-zA-Z0-9]$/.test(input)) {
    return 'Integration name must start and end with alphanumeric characters and can contain spaces, hyphens, underscores, and periods';
  }
  return true;
}

/**
 * Validates URL input
 */
export function validateUrl(input: string): string | boolean {
  if (!input.trim()) return 'URL is required';
  try {
    new URL(input);
    return true;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
}

/**
 * Validates version format
 */
export function validateVersion(input: string): string | boolean {
  if (!input.trim()) return 'Version is required';
  if (!/^\d+\.\d+\.\d+$/.test(input)) return 'Version must be in format x.y.z (e.g., 1.0.0)';
  return true;
}

/**
 * Validates publisher ID input
 */
export function validatePublisherId(input: string): string | boolean {
  if (!input.trim()) return 'Publisher ID is required';
  if (!/^[a-z0-9][a-z0-9\-.]*[a-z0-9]$/.test(input)) {
    return 'Publisher ID must be lowercase, start and end with alphanumeric characters, and can contain dots and hyphens';
  }
  return true;
}

/**
 * Validates email input
 */
export function validateEmail(input: string): string | boolean {
  if (!input.trim()) return 'Email is required';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input)) return 'Please enter a valid email address';
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
 * Prompts for integration details
 */
export async function promptIntegrationDetails(defaults?: Partial<IntegrationDetails>): Promise<IntegrationDetails> {
  const name = await input({
    message: 'Integration name:',
    default: defaults?.name || 'my-partner-integration',
    validate: validateIntegrationName
  });

  const description = await input({
    message: 'Integration description:',
    default: defaults?.description || 'Partner integration for healthcare data processing',
    validate: (input: string) => input.trim() ? true : 'Description is required'
  });

  const version = await input({
    message: 'Integration version:',
    default: defaults?.version || '0.0.1',
    validate: validateVersion
  });

  return { name, description, version };
}

/**
 * Prompts for authentication details
 */
export async function promptAuthDetails(): Promise<AuthConfig> {
  const tenantId = await input({
    message: 'Azure Tenant ID (GUID):',
    default: '00000000-0000-0000-0000-000000000000',
    validate: validateTenantId
  });

  return { tenantId };
}

/**
 * Prompts for publisher configuration
 */
export async function promptPublisherDetails(): Promise<PublisherConfig> {
  const publisherId = await input({
    message: 'Publisher ID (e.g., contoso.healthcare):',
    validate: validatePublisherId
  });

  const publisherName = await input({
    message: 'Publisher Name:',
    validate: (input: string) => input.trim() ? true : 'Publisher name is required'
  });

  const websiteUrl = await input({
    message: 'Website URL:',
    validate: validateUrl
  });

  const privacyPolicyUrl = await input({
    message: 'Privacy Policy URL:',
    validate: validateUrl
  });

  const supportUrl = await input({
    message: 'Support URL:',
    validate: validateUrl
  });

  const contactEmail = await input({
    message: 'Contact Email:',
    validate: validateEmail
  });

  const offerId = await input({
    message: 'Offer ID:',
    default: `${publisherId.split('.')[0]}-integration-suite`,
    validate: (input: string) => input.trim() ? true : 'Offer ID is required'
  });

  return {
    publisherId,
    publisherName,
    websiteUrl,
    privacyPolicyUrl,
    supportUrl,
    version: '0.0.1',
    contactEmail,
    offerId,
    defaultLocale: 'en-US',
    supportedLocales: ['en-US'],
    scope: 'US',
    regions: ['US']
  };
}

/**
 * Prompts for tool details
 */
export async function promptToolDetails(
  existingManifest?: PartnerIntegrationManifest | null,
  options?: {
    allowMultipleInputs?: boolean;
    defaults?: {
      toolName?: string;
      toolDescription?: string;
      endpoint?: string;
    };
  }
): Promise<ToolDetails> {
  const toolName = await input({
    message: 'Tool name:',
    default: options?.defaults?.toolName || 'my-integration-tool',
    validate: (input: string) => validateToolName(input, existingManifest)
  });

  const toolDescription = await input({
    message: 'Tool description:',
    default: options?.defaults?.toolDescription || 'Processes integration data',
    validate: (input: string) => input.trim() ? true : 'Tool description is required'
  });

  const endpoint = await input({
    message: 'Tool endpoint URL:',
    default: options?.defaults?.endpoint || 'https://api.example.com/v1/process',
    validate: validateUrl
  });

  const inputTypes = await checkbox({
    message: 'Select input data types:',
    choices: PARTNER_INPUT_TYPE_CHOICES,
    required: true,
    validate: (choices: readonly any[]) => {
      if (choices.length === 0) return 'At least one input type must be selected';
      return true;
    }
  }) as PartnerDataType[];

  // Prompt for outputs
  const outputs: PartnerOutput[] = [];
  let addMoreOutputs = true;
  
  while (addMoreOutputs) {
    const outputName = await input({
      message: `Output ${outputs.length + 1} name:`,
      default: outputs.length === 0 ? 'processed-data' : undefined,
      validate: (input: string) => {
        if (!input.trim()) return 'Output name is required';
        if (outputs.find(o => o.name === input)) return 'Output name must be unique';
        return true;
      }
    });

    const outputDescription = await input({
      message: `Output ${outputs.length + 1} description:`,
      default: outputs.length === 0 ? 'Processed integration data' : undefined,
      validate: (input: string) => input.trim() ? true : 'Output description is required'
    });

    const outputDataType = await select({
      message: `Output ${outputs.length + 1} data type:`,
      choices: [
        { name: 'Generic DSP Data (DSP)', value: 'DSP' },
        { name: 'Clinical Note (DSP/Note)', value: 'DSP/Note' },
        { name: 'Patient Data (DSP/Patient)', value: 'DSP/Patient' },
        { name: 'Encounter Data (DSP/Encounter)', value: 'DSP/Encounter' },
        { name: 'API Response (API/Response)', value: 'API/Response' },
        { name: 'Custom Data (Custom/Data)', value: 'Custom/Data' }
      ],
      default: 'DSP'
    });

    outputs.push({
      name: outputName,
      description: outputDescription,
      data: outputDataType
    });

    if (outputs.length >= 5) {
      addMoreOutputs = false;
    } else {
      addMoreOutputs = await confirm({
        message: 'Add another output?',
        default: false
      });
    }
  }

  return {
    toolName,
    toolDescription,
    endpoint,
    inputTypes,
    outputs
  };
}

/**
 * Gets human-readable description for input data types
 */
export function getInputDescription(dataType: string): string {
  const descriptions: Record<string, string> = {
    'DSP/Note': 'Clinical note or documentation',
    'DSP/IterativeTranscript': 'Real-time speech transcript data',
    'DSP/IterativeAudio': 'Real-time audio stream data',
    'DSP/Transcript': 'Complete speech transcript',
    'DSP/Patient': 'Patient demographic and clinical information',
    'DSP/Encounter': 'Healthcare encounter or visit information',
    'DSP/Practitioner': 'Healthcare provider information',
    'DSP/Visit': 'Patient visit or appointment data',
    'DSP/MedicalCode': 'Medical coding information (ICD, SNOMED, etc.)',
    'DSP/Document': 'Clinical document or report',
    'EHR/PatientRecord': 'Electronic health record patient data',
    'EHR/Appointment': 'Appointment or scheduling data',
    'EHR/Medication': 'Medication and prescription information',
    'EHR/LabResult': 'Laboratory test results and values',
    'API/Response': 'API response data from external systems',
    'API/Request': 'API request data for external systems',
    'Custom/Data': 'Custom data format specific to integration',
    'DSP': 'Generic Dragon Standard Payload data'
  };
  
  return descriptions[dataType] || 'Data input for processing';
}