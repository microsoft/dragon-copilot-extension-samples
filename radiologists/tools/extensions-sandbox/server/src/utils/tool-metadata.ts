import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import { getInputSchemaForContentType } from '../services/validation.js';

export interface ToolMetadata {
  name: string;
  description: string;
  endpoint: string;
  inputs: {
    name: string;
    description: string;
    contentType: string;
    required: boolean;
    /**
     * JSON Schema for the input payload, when the content-type has one
     * registered. `null` for untyped inputs, which the client renders as a
     * free-text field.
     */
    schema: Record<string, unknown> | null;
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
        schema: getInputSchemaForContentType(input['content-type']),
      })),
      outputs: t.outputs.map((output) => ({
        name: output.name,
        contentType: output['content-type'],
      })),
    }));
}
