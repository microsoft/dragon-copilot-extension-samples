import type { PublisherConfig as CommonPublisherConfig } from '../../common/index.js';

export interface DragonExtensionManifest {
  manifestVersion?: number;
  name: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: DragonTool[];
  automationScripts?: AutomationScript[];
  eventTriggers?: EventTrigger[];
  dependencies?: Dependency[];
}

export interface AuthConfig {
  tenantId: string;
}

export interface DragonTool {
  name: string;
  description: string;
  endpoint: string;
  inputs: DragonInput[];
  outputs: DragonOutput[];
}

export interface DragonInput {
  name: string;
  description: string;
  data: string;
}

export interface DragonOutput {
  name: string;
  description: string;
  data: string;
}

export interface AutomationScript {
  name: string;
  description?: string;
  entryPoint: string;
  runtime: string;
  timeoutSeconds?: number;
  environment?: Record<string, string>;
}

export interface EventTrigger {
  name: string;
  description?: string;
  eventType: string;
  conditions?: string[];
  scriptName: string;
}

export interface Dependency {
  name: string;
  version: string;
  type?: 'extension' | 'service' | 'package';
}

export type PublisherConfig = CommonPublisherConfig;

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
  manifestVersion?: number;
  name: string;
  description: string;
  version: string;
  tools: ToolTemplate[];
  automationScripts?: AutomationScriptTemplate[];
  eventTriggers?: EventTriggerTemplate[];
  dependencies?: Dependency[];
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

export interface AutomationScriptTemplate {
  name: string;
  description: string;
  entryPoint: string;
  runtime: string;
  timeoutSeconds?: number;
}

export interface EventTriggerTemplate {
  name: string;
  description: string;
  eventType: string;
  scriptName: string;
}
