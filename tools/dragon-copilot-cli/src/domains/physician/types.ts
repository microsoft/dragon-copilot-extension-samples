/**
 * Manifest without a `schemaVersion` field (the original, unversioned format).
 */
export interface LegacyDragonExtensionManifest {
  schemaVersion?: undefined;
  name: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: DragonTool[];
}

export interface DragonExtensionManifestV030 {
  schemaVersion: '0.3.0';
  name: string;
  caption: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: DragonToolV030[];
}

export const V040_SCHEMA_VERSION = '0.4.0-preview.2';

/** 0.4.0-preview.2 adds conversational tools (MCP, OpenAPI, CopilotStudio) next to DragonAPI. */
export interface DragonExtensionManifestV040 {
  schemaVersion: typeof V040_SCHEMA_VERSION;
  name: string;
  caption: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: DragonToolV040[];
}

export type DragonExtensionManifest =
  | LegacyDragonExtensionManifest
  | DragonExtensionManifestV030
  | DragonExtensionManifestV040;

/** Manifests that declare a `schemaVersion`. */
export type VersionedDragonExtensionManifest = DragonExtensionManifestV030 | DragonExtensionManifestV040;

export interface AuthConfig {
  tenantId: string;
}

export type LegacyTrigger = 'AutoRun' | 'AdaptiveCardAction';

export interface DragonTool {
  name: string;
  description: string;
  endpoint: string;
  trigger?: LegacyTrigger;
  inputs: DragonInput[];
  outputs: DragonOutput[];
}

export type ToolTrigger = 'DataAvailable' | 'ExplicitRequest';

export type ConversationalTrigger = 'IntentDriven';

export interface DragonToolV030 {
  name: string;
  caption: string;
  description: string;
  type: 'DragonAPI';
  triggers: ToolTrigger[];
  timeout?: number;
  endpoint: string;
  inputs: DragonInputV030[];
  outputs?: DragonOutput[];
}

export type ConversationalToolType = 'MCP' | 'OpenAPI' | 'CopilotStudio';

export const CONVERSATIONAL_TOOL_TYPES: readonly ConversationalToolType[] = ['MCP', 'OpenAPI', 'CopilotStudio'];

export type ToolType = DragonToolV030['type'] | ConversationalToolType;

export const TOOL_TYPES: readonly ToolType[] = ['DragonAPI', ...CONVERSATIONAL_TOOL_TYPES];

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

interface ConversationalToolBase {
  name: string;
  caption: string;
  description: string;
  triggers: ConversationalTrigger[];
  timeout?: number;
  isExclusive?: boolean;
}

export interface McpTool extends ConversationalToolBase {
  type: 'MCP';
  endpoint: string;
  expose?: string[];
  customExtractors?: Record<string, CustomExtractor[]>;
  runtimeParamBindings?: Record<string, RuntimeParamBinding[]>;
}

export interface OpenApiTool extends ConversationalToolBase {
  type: 'OpenAPI';
  specUrl?: string;
  specString?: string;
  expose?: string[];
  customExtractors?: Record<string, CustomExtractor[]>;
  runtimeParamBindings?: Record<string, RuntimeParamBinding[]>;
}

export interface CopilotStudioTool extends ConversationalToolBase {
  type: 'CopilotStudio';
  environmentId: string;
  agentIdentifier: string;
  cloud: string;
  agentType: string;
  runtimeParamBindings?: RuntimeParamBinding[];
}

export type ConversationalTool = McpTool | OpenApiTool | CopilotStudioTool;

/** 0.4.0-preview.2 tool, discriminated on `type`. */
export type DragonToolV040 = DragonToolV030 | ConversationalTool;

export interface DragonInput {
  name: string;
  description: string;
  'content-type': string;
}

export type EhrContextSelector =
  | 'provider'
  | 'patient'
  | 'current-encounter'
  | 'problem-list'
  | 'current-encounter-diagnoses'
  | 'reason-for-visit'
  | 'conditions';

export interface DragonInputV030 extends DragonInput {
  include?: EhrContextSelector[];
  required?: boolean;
}

export interface DragonOutput {
  name: string;
  description: string;
  'content-type': string;
}

export function isV030Manifest(manifest: DragonExtensionManifest): manifest is DragonExtensionManifestV030 {
  return manifest.schemaVersion === '0.3.0';
}

export function isV040Manifest(manifest: DragonExtensionManifest): manifest is DragonExtensionManifestV040 {
  return manifest.schemaVersion === V040_SCHEMA_VERSION;
}

export function isConversationalTool(tool: { type?: unknown }): tool is ConversationalTool {
  return CONVERSATIONAL_TOOL_TYPES.includes(tool.type as ConversationalToolType);
}

/** Whether a schema version supports conversational tool types. */
export function supportsConversationalTools(schemaVersion: string): boolean {
  return schemaVersion === V040_SCHEMA_VERSION;
}

export interface GenerateOptions {
  template?: string;
  output?: string;
  interactive?: boolean;
  schemaVersion?: string;
}

export interface InitOptions {
  name?: string;
  description?: string;
  version?: string;
  output?: string;
  schemaVersion?: string;
  /** Tool type for the starter tool (0.4.0-preview.2 only). */
  type?: string;
}

export interface MigrateOptions {
  to?: string;
  inPlace?: boolean;
  dryRun?: boolean;
  nonInteractive?: boolean;
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
  trigger?: 'AutoRun' | 'AdaptiveCardAction';
  inputs: Array<{
    name: string;
    description: string;
    'content-type': string;
  }>;
  outputs: Array<{
    name: string;
    description: string;
    'content-type': string;
  }>;
}

export type TemplateConfigV030 = Omit<DragonExtensionManifestV030, 'auth'>;

// Conversational templates ship a placeholder auth block so they validate out of the box.
export type TemplateConfigV040 = Omit<DragonExtensionManifestV040, 'auth'> & Partial<Pick<DragonExtensionManifestV040, 'auth'>>;
