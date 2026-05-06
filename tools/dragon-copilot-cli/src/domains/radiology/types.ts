export interface DcrExtensionManifest {
  name: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: DcrTool[];
}

export interface AuthConfig {
  tenantId: string;
}

export interface DcrTool {
  name: string;
  toolType: 'contractBased' | 'uiBased' | 'mcpBased' | 'agentBased';
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
  required?: boolean;
  config?: DcrInputConfig;
}

export interface DcrOutput {
  name: string;
  description: string;
  'content-type': string;
}

export interface DcrInputConfig {
  minNumberOfPriors?: number;
  maxNumberOfPriors?: number;
  relevantBodyParts?: string[];
  relevantModalities?: string[];
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
  tools: ToolTemplate[];
}

export interface ToolTemplate {
  name: string;
  toolType: 'contractBased' | 'uiBased' | 'mcpBased' | 'agentBased';
  capability: 'qualityCheck';
  description: string;
  endpoint: string;
  inputs: Array<{
    name: string;
    description: string;
    'content-type': string;
    required?: boolean;
    config?: DcrInputConfig;
  }>;
  outputs: Array<{
    name: string;
    description: string;
    'content-type': string;
  }>;
  relevanceFilteringCriteria?: RelevanceFilteringCriteria;
  configurationTemplate?: Record<string, any>;
}
