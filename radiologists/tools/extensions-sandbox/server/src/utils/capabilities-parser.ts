import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import { CAPABILITY_CHOICES } from '../cli/radiologists/index.js';

export interface ParsedCapability {
  /** The manifest `capability` value, used to look up the capability's tools. */
  name: string;
  /** Label shown in the UI. */
  displayName: string;
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
 * Uses the CLI's label for a known capability (the same label its wizard
 * offers), otherwise humanizes the raw value.
 */
function getCapabilityDisplayName(name: string): string {
  return CAPABILITY_CHOICES.find((choice) => choice.value === name)?.name ?? humanizeCapabilityName(name);
}

/**
 * Parses an extension manifest and groups tools by their `capability` field.
 * Returns an array of capabilities with name, display name, description, and tool count.
 */
export function parseCapabilities(manifest: ExtensionManifest): ParsedCapability[] {
  const capabilityMap = new Map<string, { displayName: string; description: string; toolCount: number }>();
  for (const tool of manifest.tools) {
    const existing = capabilityMap.get(tool.capability);
    if (existing) {
      existing.toolCount += 1;
    } else {
      const displayName = getCapabilityDisplayName(tool.capability);
      capabilityMap.set(tool.capability, {
        displayName,
        description: `${displayName} capability`,
        toolCount: 1,
      });
    }
  }

  return Array.from(capabilityMap.entries()).map(([name, data]) => ({
    name,
    displayName: data.displayName,
    description: data.description,
    toolCount: data.toolCount,
  }));
}
