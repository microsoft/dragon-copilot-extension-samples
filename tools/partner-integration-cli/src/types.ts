export interface PartnerIntegrationManifest {
  name: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: PartnerTool[];
}

export interface AuthConfig {
  tenantId: string;
}

export interface PartnerTool {
  name: string;
  description: string;
  endpoint: string;
  inputs: PartnerInput[];
  outputs: PartnerOutput[];
}

export interface PartnerInput {
  name: string;
  description: string;
  data: string;
}

export interface PartnerOutput {
  name: string;
  description: string;
  data: string;
}

export interface PublisherConfig {
  publisherId: string;
  publisherName: string;
  websiteUrl: string;
  privacyPolicyUrl: string;
  supportUrl: string;
  version: string;
  contactEmail: string;
  offerId: string;
  defaultLocale: string;
  supportedLocales: string[];
  scope: string;
  regions: string[];
}

export interface GenerateOptions {
  template?: string;
  output?: string;
  interactive?: boolean;
}

export interface InitOptions {
  name?: string;
  description?: string;
  version?: string;
  output?: string;
}

export interface PackageOptions {
  manifest?: string;
  output?: string;
  include?: string[];
  silent?: boolean;
}

export interface TemplateConfig {
  name: string;
  description: string;
  version: string;
  tools: ToolTemplate[];
}

export interface ToolTemplate {
  name: string;
  description: string;
  endpoint: string;
  inputs: Array<{
    name: string;
    description: string;
    data: string;
  }>;
  outputs: Array<{
    name: string;
    description: string;
    data: string;
  }>;
}

// Data type definitions for partner integrations
export type PartnerDataType = 
  | 'DSP/Note'
  | 'DSP/Transcript' 
  | 'DSP/IterativeTranscript'
  | 'DSP/IterativeAudio'
  | 'DSP/Patient'
  | 'DSP/Encounter'
  | 'DSP/Practitioner'
  | 'DSP/Visit'
  | 'DSP/MedicalCode'
  | 'DSP/Document'
  | 'DSP'
  | 'EHR/PatientRecord'
  | 'EHR/Appointment'
  | 'EHR/Medication'
  | 'EHR/LabResult'
  | 'API/Response'
  | 'API/Request'
  | 'Custom/Data';

export interface IntegrationDetails {
  name: string;
  description: string;
  version: string;
}

export interface AuthDetails {
  tenantId: string;
}

export interface ToolDetails {
  toolName: string;
  toolDescription: string;
  endpoint: string;
  inputTypes: PartnerDataType[];
  outputs: PartnerOutput[];
}