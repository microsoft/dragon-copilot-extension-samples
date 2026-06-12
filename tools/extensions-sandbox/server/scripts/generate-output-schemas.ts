/**
 * Extracts JSON Schema definitions from the radiology OpenAPI YAML spec.
 *
 * Reads the OpenAPI document, resolves internal $refs for the target schema
 * (QualityCheckResult) and its transitive dependencies, then writes a
 * standalone JSON Schema file to src/schemas/generated-schemas/.
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
  __dirname, '..', 'src', 'schemas', 'radiology', 'radiology-extensibility-api.yaml',
);
const OUTPUT_DIR = resolve(__dirname, '..', 'src', 'schemas', 'generated-schemas');

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
    description: (root['description'] as string) ?? `Schema for ${rootName}`,
    ...rewritten,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const specRaw = readFileSync(OPENAPI_PATH, 'utf-8');
const spec = yaml.load(specRaw) as OpenAPISpec;
const allSchemas = spec.components.schemas;

// Generate QualityCheckResult schema
const qualityCheckSchema = resolveSchema('QualityCheckResult', allSchemas);

mkdirSync(OUTPUT_DIR, { recursive: true });
const outputPath = resolve(OUTPUT_DIR, 'quality-check-result.json');
writeFileSync(outputPath, JSON.stringify(qualityCheckSchema, null, 2) + '\n', 'utf-8');

console.log(`✓ Generated ${outputPath}`);
