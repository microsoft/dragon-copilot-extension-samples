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

/**
 * Upper bound on the values (objects, arrays and scalars) in a manifest we will
 * validate. The validator reports every error (`allErrors`), so Ajv walks the
 * whole document; YAML aliases can expand a file of a few KB into hundreds of
 * thousands of values, so the byte limits on uploads and request bodies alone
 * do not bound that walk. Real manifests contain well under a hundred values.
 */
export const MAX_MANIFEST_VALUES = 10_000;

/** Counts values reachable from `root`, stopping as soon as `limit` is exceeded. */
function exceedsValueLimit(root: unknown, limit: number): boolean {
  const pending: unknown[] = [root];
  let count = 1;
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') {
      continue;
    }
    for (const child of Object.values(value)) {
      if (++count > limit) {
        return true;
      }
      pending.push(child);
    }
  }
  return false;
}

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
  if (exceedsValueLimit(parsed, MAX_MANIFEST_VALUES)) {
    return {
      valid: false,
      errors: [
        {
          path: '/',
          line: null,
          message: `/: manifest exceeds ${MAX_MANIFEST_VALUES} values`,
          detail: `The manifest contains more than ${MAX_MANIFEST_VALUES} values (objects, arrays and fields), so it was not validated.`,
          hint: 'Reduce the number of tools, inputs and outputs. If the file uses YAML anchors and aliases (&name / *name), write the content out explicitly instead.',
          severity: 'error',
        },
      ],
    };
  }

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
