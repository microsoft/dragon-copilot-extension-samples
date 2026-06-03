import type { ExtensionManifest } from '../schemas/manifest.schema.js';

export interface ParsedCapability {
  name: string;
  description: string;
  toolCount: number;
}

/**
 * Converts a capability name (camelCase, snake_case, kebab-case, ALLCAPS)
 * into a human-readable description.
 */
function humanizeCapabilityName(name: string): string {
  return name
    // Insert space before uppercase letters (camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores and hyphens with spaces (snake_case, kebab-case)
    .replace(/[_-]+/g, ' ')
    // Handle consecutive uppercase letters (e.g., "ALLCAPS" → keep together, "XMLParser" → "XML Parser")
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Capitalize first letter, lowercase the rest of each word for consistency
    .replace(/\b\w/g, (s) => s.toUpperCase())
    .trim();
}

/**
 * Parses an extension manifest and groups tools by their `capability` field.
 * Returns an array of capabilities with name, description, and tool count.
 */
export function parseCapabilities(manifest: ExtensionManifest): ParsedCapability[] {
  const capabilityMap = new Map<string, { description: string; toolCount: number }>();
  for (const tool of manifest.tools) {
    const existing = capabilityMap.get(tool.capability);
    if (existing) {
      existing.toolCount += 1;
    } else {
      capabilityMap.set(tool.capability, {
        description: `${humanizeCapabilityName(tool.capability)} capability`,
        toolCount: 1,
      });
    }
  }

  return Array.from(capabilityMap.entries()).map(([name, data]) => ({
    name,
    description: data.description,
    toolCount: data.toolCount,
  }));
}
