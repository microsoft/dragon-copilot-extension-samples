/**
 * Selectable values and field defaults for radiologists manifests.
 *
 * Single source of truth for both the CLI's interactive prompts and the
 * Extensions Sandbox wizard, so the two offer exactly the same options.
 * Part of the pure manifest core — see `./types.ts`.
 */
import type { Capability, ManifestChoice, ToolType } from './types.js';

export const REPORT_CONTENT_TYPE = 'application/vnd.ms-dragon.rad.report+json';
export const PATIENT_INFORMATION_CONTENT_TYPE = 'application/vnd.ms-dragon.rad.patient-information+json';

/** The only output media type the radiologists manifest schema allows today. */
export const DEFAULT_OUTPUT_CONTENT_TYPE = 'application/vnd.ms-dragon.rad.quality-check-result+json';

/** Payload schema version (major.minor) applied to generated inputs and outputs. */
export const DEFAULT_PAYLOAD_SCHEMA_VERSION = '1.0';

export const DEFAULT_TOOL_TYPE: ToolType = 'contractBased';
export const DEFAULT_CAPABILITY: Capability = 'qualityCheck';

export const INPUT_TYPE_CHOICES: ManifestChoice[] = [
  { name: 'Radiology Report', value: REPORT_CONTENT_TYPE },
  { name: 'Patient Information', value: PATIENT_INFORMATION_CONTENT_TYPE },
];

export const OUTPUT_TYPE_CHOICES: ManifestChoice[] = [
  { name: 'Quality Check Result', value: DEFAULT_OUTPUT_CONTENT_TYPE },
];

export const TOOL_TYPE_CHOICES: ManifestChoice<ToolType>[] = [
  { name: 'Contract Based', value: DEFAULT_TOOL_TYPE },
];

export const CAPABILITY_CHOICES: ManifestChoice<Capability>[] = [
  { name: 'Quality Check', value: DEFAULT_CAPABILITY },
];

export const BODY_PART_CHOICES: ManifestChoice[] = [
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

export const MODALITY_CHOICES: ManifestChoice[] = [
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

/** Field defaults offered by the CLI wizard and pre-filled in the sandbox wizard. */
export const MANIFEST_DEFAULTS = {
  extensionName: 'myRadiologistsExtension',
  extensionDescription: 'A Dragon Copilot radiologists extension',
  version: '0.0.1',
  radiologistsExtensibilityApiVersion: '1.0.0',
  toolName: 'myRadiologistsTool',
  toolDescription: 'Processes radiology reports and imaging data',
  endpoint: 'https://api.example.com/radiologists/v1/process',
  outputName: 'qualityCheckResult',
  outputDescription: 'Quality check result',
  schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION,
} as const;

/**
 * Describes an input content type in generated manifests.
 */
export function getInputDescription(contentType: string): string {
  switch (contentType) {
    case REPORT_CONTENT_TYPE:
      return 'Radiology report from Dragon Copilot';
    case PATIENT_INFORMATION_CONTENT_TYPE:
      return 'Patient demographic information from Dragon Copilot';
    default:
      return 'Data from Dragon Copilot';
  }
}

/**
 * Maps a content-type to a default input name.
 */
export function getInputName(contentType: string, index: number): string {
  switch (contentType) {
    case REPORT_CONTENT_TYPE:
      return 'report';
    case PATIENT_INFORMATION_CONTENT_TYPE:
      return 'patientInformation';
    default:
      return `input-${index + 1}`;
  }
}
