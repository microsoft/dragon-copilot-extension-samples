export interface DragonExtensionManifest {
  name: string;
  description: string;
  version: string;
  authentication?: string;
  tools: DragonTool[];
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
  countries: string[];
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
