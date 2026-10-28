import type {
  AuthConfig,
  DragonExtensionManifest,
  DragonExtensionManifestV030,
  DragonTool,
  DragonToolV030
} from '../types.js';
import type { ExtensionDetails, ToolDetails } from './prompts.js';
import {
  buildV030Inputs,
  getInputDescription,
  getInputName,
  humanizeName,
  isLegacySchema
} from './prompts.js';

export function buildTool(details: ToolDetails, schemaVersion: string): DragonTool | DragonToolV030 {
  if (isLegacySchema(schemaVersion)) {
    return {
      name: details.toolName,
      description: details.toolDescription,
      endpoint: details.endpoint,
      ...(details.trigger ? { trigger: details.trigger } : {}),
      inputs: details.inputTypes.map((contentType, index) => ({
        name: getInputName(contentType, index),
        description: getInputDescription(contentType),
        'content-type': contentType
      })),
      outputs: details.outputs
    };
  }

  return {
    name: details.toolName,
    caption: details.caption || humanizeName(details.toolName),
    description: details.toolDescription,
    type: 'DragonAPI',
    triggers: details.triggers && details.triggers.length > 0 ? details.triggers : ['DataAvailable'],
    ...(details.timeout !== undefined ? { timeout: details.timeout } : {}),
    endpoint: details.endpoint,
    inputs: details.inputs ?? buildV030Inputs(details.inputTypes, details.ehrInclude),
    ...(details.outputs.length > 0 ? { outputs: details.outputs } : {})
  };
}

export function buildManifest(
  extension: ExtensionDetails,
  auth: AuthConfig,
  schemaVersion: string
): DragonExtensionManifest {
  if (isLegacySchema(schemaVersion)) {
    return {
      name: extension.name,
      description: extension.description,
      version: extension.version,
      auth,
      tools: []
    };
  }

  // schemaVersion goes first so readers can see which format the file uses at a glance.
  return {
    schemaVersion: schemaVersion as DragonExtensionManifestV030['schemaVersion'],
    name: extension.name,
    caption: extension.caption || humanizeName(extension.name),
    description: extension.description,
    version: extension.version,
    auth,
    tools: []
  };
}
