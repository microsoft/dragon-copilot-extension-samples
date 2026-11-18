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

export type DragonExtensionManifest = LegacyDragonExtensionManifest | DragonExtensionManifestV030;

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
