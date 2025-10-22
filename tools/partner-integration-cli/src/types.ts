export type YesNo = 'yes' | 'no';

export type PartnerDataType =
  | 'DSP/Note'
  | 'DSP/IterativeTranscript'
  | 'DSP/IterativeAudio'
  | 'DSP/Transcript'
  | 'DSP/Patient'
  | 'DSP/Encounter'
  | 'DSP/Practitioner'
  | 'DSP/Visit'
  | 'DSP/MedicalCode'
  | 'DSP/Document'
  | 'EHR/PatientRecord'
  | 'EHR/Appointment'
  | 'EHR/Medication'
  | 'EHR/LabResult'
  | 'API/Response'
  | 'API/Request'
  | 'Custom/Data'
  | 'DSP';

export interface PartnerOutput {
  name: string;
  description: string;
  data: string;
}

export interface ToolInput {
  name: string;
  description: string;
  data: PartnerDataType;
}

export interface ToolDefinition {
  name: string;
  description: string;
  endpoint: string;
  inputs: ToolInput[];
  outputs: PartnerOutput[];
}

export interface ToolDetails {
  toolName: string;
  toolDescription: string;
  endpoint: string;
  inputTypes: PartnerDataType[];
  outputs: PartnerOutput[];
}

export interface AuthConfig {
  tenantId: string;
}

export type NoteSectionValue = string | string[] | null;

export interface PartnerIntegrationManifest {
  name: string;
  description: string;
  version: string;
  ['partner-id']: string;
  ['server-authentication']: ServerAuthenticationEntry[];
  ['note-sections']?: Record<string, NoteSectionValue>;
  instance: InstanceConfig;
  tools?: ToolDefinition[];
}

export interface ServerAuthenticationEntry {
  issuer: string;
  identity_claim: string;
  identity_value: string[];
}

export interface InstanceConfig {
  ['client-authentication']: ClientAuthenticationConfig;
  ['web-launch-sof']?: NamedFieldConfig;
  ['web-launch-token']?: WebLaunchTokenConfig;
  ['context-retrieval']?: ContextRetrievalConfig;
}

export interface ClientAuthenticationConfig {
  ['allow-multiple-issuers']?: YesNo;
  issuer: ClientAuthenticationIssuerFields;
}

export interface ManifestFieldConfig {
  type: string;
  description: string;
  ['default-value']?: string;
  required: YesNo;
}

export interface NamedFieldConfig extends ManifestFieldConfig {
  name?: string;
}

export interface ClientAuthenticationIssuerFields {
  ['access-token-issuer']: ManifestFieldConfig;
  ['user-identity-claim']?: ManifestFieldConfig;
  ['customer-identity-claim']?: ManifestFieldConfig;
}

export interface WebLaunchTokenConfig {
  ['use-client-authentication']?: YesNo;
  ['allow-multiple-issuers']?: YesNo;
  issuer?: NamedFieldConfig[];
}

export interface ContextRetrievalConfig {
  instance: ContextRetrievalItem[];
}

export interface ContextRetrievalItem {
  name: string;
  type: string;
  description: string;
  required: YesNo;
  ['default-value']?: string;
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
  manifest: PartnerIntegrationManifest;
  description: string;
}

export interface IntegrationDetails {
  name: string;
  description: string;
  version: string;
  partnerId: string;
  rawName?: string;
}