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
  trigger?: 'AutoRun' | 'AdaptiveCardAction';
  inputs: DragonInput[];
  outputs: DragonOutput[];
}

export interface DragonInput {
  name: string;
  description: string;
  data?: string; // Deprecated: use content-type. EOL: 2026-03-30
  'content-type'?: string;
}

export interface DragonOutput {
  name: string;
  description: string;
  data?: string; // Deprecated: use content-type. EOL: 2026-03-30
  'content-type'?: string;
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
    data?: string; // Deprecated
    'content-type'?: string;
  }>;
  outputs: Array<{
    name: string;
    description: string;
    data?: string; // Deprecated
    'content-type'?: string;
  }>;
}
