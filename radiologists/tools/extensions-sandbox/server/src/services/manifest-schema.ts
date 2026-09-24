import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import { buildDetailedErrors } from '../utils/validation-hints.js';
import { mapPathsToLines } from '../utils/source-mapper.js';
import { MANIFEST_SCHEMA_PATH } from '../utils/schema-path.js';

/**
 * Single compiled validator for the Dragon Copilot (radiologists) manifest schema,
 * shared by every surface that accepts a manifest — upload, paste-and-validate,
 * and CLI wizard generation — so all of them report failures identically.
 */
const manifestJsonSchema = JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, 'utf-8'));

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(manifestJsonSchema);

export type DetailedValidationError = ReturnType<typeof buildDetailedErrors>[number];

export type ManifestValidationResult =
  | { valid: true; manifest: ExtensionManifest }
  | { valid: false; errors: DetailedValidationError[] };

/** Compact manifest description returned to the client after a successful validation. */
export interface ManifestSummary {
  name: string;
  version: string;
  toolCount: number;
  capabilities: string[];
}

/**
 * Validates a parsed manifest against the schema, resolving each failure to a
 * line in `sourceText` and an actionable hint.
 *
 * @param parsed Manifest already parsed from JSON or YAML.
 * @param sourceText The JSON/YAML the manifest was parsed from, used for line numbers.
 */
export function validateManifestDocument(parsed: unknown, sourceText: string): ManifestValidationResult {
  if (validateSchema(parsed)) {
    return { valid: true, manifest: parsed as ExtensionManifest };
  }

  const rawErrors = validateSchema.errors ?? [];

  // Compute precise target paths for line resolution.
  // For 'required' errors, AJV points to the parent — extend to the missing property.
  // For 'additionalProperties', extend to the extra property.
  const targetPaths = rawErrors.map((err) => {
    const base = err.instancePath || '/';
    const params = err.params as Record<string, unknown>;
    if (err.keyword === 'required' && params.missingProperty) {
      const sep = base === '/' ? '' : '/';
      return `${base}${sep}${params.missingProperty}`;
    }
    if (err.keyword === 'additionalProperties' && params.additionalProperty) {
      const sep = base === '/' ? '' : '/';
      return `${base}${sep}${params.additionalProperty}`;
    }
    return base;
  });

  const lineMap = mapPathsToLines(sourceText, targetPaths);

  return { valid: false, errors: buildDetailedErrors(rawErrors, lineMap, targetPaths) };
}

/**
 * Summarizes a validated manifest for the client.
 */
export function summarizeManifest(manifest: ExtensionManifest): ManifestSummary {
  return {
    name: manifest.name,
    version: manifest.version,
    toolCount: manifest.tools.length,
    capabilities: [...new Set(manifest.tools.map((tool) => tool.capability))],
  };
}

/**
 * Human-readable confirmation used in successful validation responses.
 */
export function describeManifest(summary: ManifestSummary): string {
  return `Manifest is valid. ${summary.toolCount} tool(s) found across ${summary.capabilities.length} capability(ies).`;
}
