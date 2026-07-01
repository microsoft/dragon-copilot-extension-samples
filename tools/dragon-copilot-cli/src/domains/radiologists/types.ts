export interface DcrExtensionManifest {
  name: string;
  description: string;
  version: string;
  radiologistsExtensibilityApiVersion: string;
  auth: AuthConfig;
  tools: DcrTool[];
}

export interface AuthConfig {
  tenantId: string;
}

export interface DcrTool {
  name: string;
  toolType: 'contractBased';
  capability: 'qualityCheck';
  description: string;
  endpoint: string;
  inputs: DcrInput[];
  outputs: DcrOutput[];
  relevanceFilteringCriteria?: RelevanceFilteringCriteria;
  configurationTemplate?: Record<string, any>;
}

export interface DcrInput {
  name: string;
  description: string;
  'content-type': string;
  schemaVersion: string;
  required?: boolean;
}

export interface DcrOutput {
  name: string;
  description: string;
  'content-type': string;
  schemaVersion: string;
}

export interface RelevanceFilteringCriteria {
  relevantBodyParts?: string[];
  relevantModalities?: string[];
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
  radiologistsExtensibilityApiVersion: string;
  tools: ToolTemplate[];
}

export interface ToolTemplate {
  name: string;
  toolType: 'contractBased';
  capability: 'qualityCheck';
  description: string;
  endpoint: string;
  inputs: Array<{
    name: string;
    description: string;
    'content-type': string;
    schemaVersion: string;
    required?: boolean;
  }>;
  outputs: Array<{
    name: string;
    description: string;
    'content-type': string;
    schemaVersion: string;
  }>;
  relevanceFilteringCriteria?: RelevanceFilteringCriteria;
  configurationTemplate?: Record<string, any>;
}
