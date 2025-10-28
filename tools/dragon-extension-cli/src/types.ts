import type { PublisherConfig as CommonPublisherConfig } from '@dragon-copilot/cli-common';

export interface DragonExtensionManifest {
  name: string;
  description: string;
  version: string;
  auth: AuthConfig;
  tools: DragonTool[];
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
