import type { ExtensionManifest } from '../schemas/manifest.schema.js';

export interface ToolMetadata {
  name: string;
  description: string;
  endpoint: string;
  inputs: {
    name: string;
    description: string;
    contentType: string;
    required: boolean;
  }[];
  outputs: {
    name: string;
    contentType: string;
  }[];
}

/**
 * Returns the tools for a given capability from the manifest.
 * Returns `null` if the capability does not exist in the manifest.
 */
export function getToolsForCapability(manifest: ExtensionManifest, capabilityName: string): ToolMetadata[] | null {
  const allCapabilities = [...new Set(manifest.tools.map((t) => t.capability))];

  if (!allCapabilities.includes(capabilityName as typeof manifest.tools[number]['capability'])) {
    return null;
  }

  return manifest.tools
    .filter((t) => t.capability === capabilityName)
    .map((t) => ({
      name: t.name,
      description: t.description,
      endpoint: t.endpoint,
      inputs: t.inputs.map((input) => ({
        name: input.name,
        description: input.description,
        contentType: input['content-type'],
        required: input.required ?? false,
      })),
      outputs: t.outputs.map((output) => ({
        name: output.name,
        contentType: output['content-type'],
      })),
    }));
}
