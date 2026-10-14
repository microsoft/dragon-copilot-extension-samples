export const CONVERSATIONAL_SCHEMA_VERSION = '0.4.0-preview.2';

export type ConversationalToolType = 'MCP' | 'OpenAPI' | 'CopilotStudio';

export const CONVERSATIONAL_TOOL_TYPES: readonly ConversationalToolType[] = ['MCP', 'OpenAPI', 'CopilotStudio'];

export type ExtractorType =
  | 'Evidence Link'
  | 'Evidence Title'
  | 'Evidence Image'
  | 'Evidence Author'
  | 'Evidence Snippet'
  | 'Response Text'
  | 'Evidence Id'
  | 'Document Source';

export interface CustomExtractor {
  propertyPath: string;
  extractorType: ExtractorType;
  description?: string;
}

export interface RuntimeParamBinding {
  source: string;
  target?: 'argument' | 'header' | 'sideChannel' | 'body' | 'intent';
  path: string;
  required?: boolean;
}

export interface ConversationalTool {
  name: string;
  caption: string;
  description: string;
  type: ConversationalToolType | 'DragonAPI';
  triggers: string[];
  timeout?: number;
  isExclusive?: boolean;
  endpoint?: string;
  expose?: string[];
  specUrl?: string;
  specString?: string;
  customExtractors?: Record<string, CustomExtractor[]>;
  runtimeParamBindings?: Record<string, RuntimeParamBinding[]> | RuntimeParamBinding[];
  environmentId?: string;
  agentIdentifier?: string;
  cloud?: string;
  agentType?: string;
  [key: string]: unknown;
}

export interface ConversationalManifest {
  schemaVersion: string;
  name: string;
  caption: string;
  description: string;
  version: string;
  auth: {
    tenantId: string;
  };
  tools: ConversationalTool[];
}

export interface InitOptions {
  name?: string;
  description?: string;
  version?: string;
  output?: string;
  type?: string;
}

export interface GenerateOptions {
  template?: string;
  output?: string;
  interactive?: boolean;
}

export interface PackageOptions {
  manifest?: string;
  output?: string;
  include?: string[];
  silent?: boolean;
}
