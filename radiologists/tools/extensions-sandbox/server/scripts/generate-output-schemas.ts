/**
 * Extracts JSON Schema definitions from the radiologists OpenAPI YAML spec.
 *
 * Reads the OpenAPI document, resolves internal $refs for each target schema
 * and its transitive dependencies, then writes standalone JSON Schema files to
 * src/schemas/generated-schemas/.
 *
 * Every file in that folder is produced here, so the input schemas the sandbox
 * validates against (Report, PatientInformation) cannot drift from the OpenAPI
 * contract the way hand-maintained copies silently would.
 *
 * Usage:  node --loader tsx scripts/generate-output-schemas.ts
 *    or:  npx tsx scripts/generate-output-schemas.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAPI_PATH = resolve(
  __dirname, '..', 'src', 'schemas', 'radiologists', 'radiologists-extensibility-api.yaml',
);
const OUTPUT_DIR = resolve(__dirname, '..', 'src', 'schemas', 'generated-schemas');

interface SchemaTarget {
  /** Schema name under `components.schemas` in the OpenAPI document. */
  rootName: string;
  /** File written to OUTPUT_DIR. */
  outputFile: string;
  /**
   * Used only when the OpenAPI schema carries no `description` of its own.
   * `Report` has none upstream, so without this the generated file would
   * regress to the generic "Schema for Report" fallback.
   */
  descriptionFallback?: string;
}

const SCHEMA_TARGETS: SchemaTarget[] = [
  { rootName: 'QualityCheckResult', outputFile: 'quality-check-result.json' },
  { rootName: 'Report', outputFile: 'report.json', descriptionFallback: 'Radiology report input.' },
  { rootName: 'PatientInformation', outputFile: 'patient-information.json' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface OpenAPISpec {
  components: {
    schemas: Record<string, Record<string, unknown>>;
  };
}

/**
 * Recursively collects all schema names referenced via $ref within a schema node.
 */
function collectRefs(node: unknown, refs: Set<string>): void {
  if (node === null || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
    return;
  }

  const obj = node as Record<string, unknown>;
  if (typeof obj['$ref'] === 'string') {
    const match = (obj['$ref'] as string).match(/#\/components\/schemas\/(\w+)/);
    if (match) refs.add(match[1]);
  }

  for (const value of Object.values(obj)) {
    collectRefs(value, refs);
  }
}

/**
 * Resolves all $ref pointers in a schema tree to inline definitions using a
 * JSON Schema `$defs` block (compatible with draft-07 via definitions).
 */
function resolveSchema(
  rootName: string,
  allSchemas: Record<string, Record<string, unknown>>,
  descriptionFallback?: string,
): Record<string, unknown> {
  const needed = new Set<string>();
  const visited = new Set<string>();
  const queue = [rootName];

  while (queue.length > 0) {
    const name = queue.pop()!;
    if (visited.has(name)) continue;
    visited.add(name);

    const schema = allSchemas[name];
    if (!schema) throw new Error(`Schema '${name}' not found in OpenAPI components.`);

    const refs = new Set<string>();
    collectRefs(schema, refs);
    for (const ref of refs) {
      needed.add(ref);
      queue.push(ref);
    }
  }

  // Build the root schema with definitions for referenced types
  const root = structuredClone(allSchemas[rootName]);

  // Rewrite $refs from OpenAPI pointer style to local definitions
  function rewriteRefs(node: unknown): unknown {
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(rewriteRefs);

    const obj = node as Record<string, unknown>;
    if (typeof obj['$ref'] === 'string') {
      const match = (obj['$ref'] as string).match(/#\/components\/schemas\/(\w+)/);
      if (match) {
        return { $ref: `#/definitions/${match[1]}` };
      }
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = rewriteRefs(value);
    }
    return result;
  }

  const rewritten = rewriteRefs(root) as Record<string, unknown>;

  // Add definitions block
  if (needed.size > 0) {
    const definitions: Record<string, unknown> = {};
    for (const name of needed) {
      definitions[name] = rewriteRefs(structuredClone(allSchemas[name]));
    }
    rewritten['definitions'] = definitions;
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: rootName,
    description:
      (root['description'] as string) ?? descriptionFallback ?? `Schema for ${rootName}`,
    ...rewritten,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const specRaw = readFileSync(OPENAPI_PATH, 'utf-8');
const spec = yaml.load(specRaw) as OpenAPISpec;
const allSchemas = spec.components.schemas;

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const { rootName, outputFile, descriptionFallback } of SCHEMA_TARGETS) {
  const schema = resolveSchema(rootName, allSchemas, descriptionFallback);
  const outputPath = resolve(OUTPUT_DIR, outputFile);
  writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n', 'utf-8');
  console.log(`✓ Generated ${outputPath}`);
}
