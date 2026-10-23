/**
 * Manifest data contracts for Dragon Copilot (radiologists) extensions.
 *
 * Part of the pure manifest core (`domains/radiologists/manifest/`): no prompts,
 * no filesystem access, no `process.exit`. The Extensions Sandbox syncs this
 * folder in verbatim (see `radiologists/tools/extensions-sandbox/server/scripts/sync-schemas.ts`)
 * so the sandbox's "Dragon Copilot CLI" wizard produces byte-identical manifests
 * to the CLI. Keep it free of CLI-only dependencies.
 */

/** The integration pattern a tool uses. */
export type ToolType = 'contractBased';

/** The capability a tool provides. */
export type Capability = 'qualityCheck';

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
  toolType: ToolType;
  capability: Capability;
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

export interface TemplateConfig {
  name: string;
  description: string;
  version: string;
  radiologistsExtensibilityApiVersion: string;
  tools: ToolTemplate[];
}

export interface ToolTemplate {
  name: string;
  toolType: ToolType;
  capability: Capability;
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

/** A selectable option, shared by the CLI prompts and the sandbox wizard UI. */
export interface ManifestChoice<TValue extends string = string> {
  name: string;
  value: TValue;
}
