/**
 * Radiologists domain types.
 *
 * Manifest data contracts live in the pure manifest core (`./manifest/types.ts`)
 * so they can be shared with the Extensions Sandbox; they are re-exported here
 * to keep the existing `../types.js` import paths working. Only CLI command
 * options are declared in this file.
 */
export type {
  AuthConfig,
  Capability,
  DcrExtensionManifest,
  DcrInput,
  DcrOutput,
  DcrTool,
  ManifestChoice,
  RelevanceFilteringCriteria,
  TemplateConfig,
  ToolTemplate,
  ToolType,
} from './manifest/types.js';

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
