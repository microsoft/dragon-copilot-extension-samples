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

export type DcrToolType = 'contractBased' | 'partnerInitiated';

export type DcrCapability = 'qualityCheck' | 'preDraftReportGeneration';

export interface DcrTool {
  name: string;
  toolType: DcrToolType;
  capability: DcrCapability;
  description: string;
  /** Required for contractBased tools; omitted for partnerInitiated, which are never called. */
  endpoint?: string;
  /** Required for contractBased tools; omitted for partnerInitiated, which receive no inputs. */
  inputs?: DcrInput[];
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
  toolType: DcrToolType;
  capability: DcrCapability;
  description: string;
  endpoint?: string;
  inputs?: Array<{
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
