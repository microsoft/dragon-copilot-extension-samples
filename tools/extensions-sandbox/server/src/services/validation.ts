import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { sessionStore } from '../store/session.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationCheck {
  check: string;
  passed: boolean;
  path?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  toolName: string;
  outputContentType: string;
  checks: ValidationCheck[];
  summary: { passed: number; failed: number };
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Schema registry – maps output content-types to JSON Schema files
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_SCHEMAS_DIR = join(__dirname, '..', 'schemas', 'generated-schemas');

const CONTENT_TYPE_SCHEMA_MAP: Record<string, string> = {
  'application/vnd.ms-dragon.rad.quality-check-result+json': 'quality-check-result.json',
};

// ---------------------------------------------------------------------------
// AJV instance – shared, validators cached per schema file
// ---------------------------------------------------------------------------

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);

const validatorCache = new Map<string, ValidateFunction>();

function getValidator(schemaFile: string): ValidateFunction {
  const cached = validatorCache.get(schemaFile);
  if (cached) return cached;

  const schemaPath = join(OUTPUT_SCHEMAS_DIR, schemaFile);

  let raw: string;
  try {
    raw = readFileSync(schemaPath, 'utf-8');
  } catch {
    throw new Error(
      `Schema file '${schemaFile}' not found at ${schemaPath}. ` +
      `Ensure the build step copied generated-schemas to dist/.`,
    );
  }

  let schema: unknown;
  try {
    schema = JSON.parse(raw);
  } catch {
    throw new Error(`Schema file '${schemaFile}' contains invalid JSON.`);
  }

  const compiled = ajv.compile(schema as object);
  validatorCache.set(schemaFile, compiled);
  return compiled;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a tool execution response against the expected output schema.
 *
 * Resolution order:
 *  1. Find the tool in the loaded manifest by name.
 *  2. Determine the output content-type from the tool's first output.
 *  3. Look up the corresponding JSON Schema in the registry.
 *  4. Validate the payload with AJV.
 */
export function validateToolResponse(
  toolName: string,
  responsePayload: unknown,
): ValidationResult {
  const timestamp = new Date().toISOString();
  const manifest = sessionStore.getManifest();

  // ── Guard: no manifest loaded ──────────────────────────────────────────
  if (!manifest) {
    return makeErrorResult(toolName, 'unknown', timestamp, 'No manifest loaded. Upload a manifest first.');
  }

  // ── Guard: tool not found ──────────────────────────────────────────────
  const tool = manifest.tools.find((t) => t.name === toolName);
  if (!tool) {
    const available = manifest.tools.map((t) => t.name).join(', ');
    return makeErrorResult(
      toolName,
      'unknown',
      timestamp,
      `Tool '${toolName}' not found in manifest. Available tools: ${available}`,
    );
  }

  // ── Guard: tool has no outputs ──────────────────────────────────────────
  if (!tool.outputs || tool.outputs.length === 0) {
    return makeErrorResult(
      toolName,
      'none',
      timestamp,
      `Tool '${toolName}' has no outputs defined in the manifest. Cannot validate response.`,
    );
  }

  // ── Resolve output content-type ────────────────────────────────────────
  const outputContentType = tool.outputs[0]['content-type'];

  // ── Guard: no schema registered for this content-type ──────────────────
  const schemaFile = CONTENT_TYPE_SCHEMA_MAP[outputContentType];
  if (!schemaFile) {
    return makeErrorResult(
      toolName,
      outputContentType,
      timestamp,
      `No validation schema registered for output content-type '${outputContentType}'.`,
    );
  }

  // ── Guard: payload must be a non-null object ───────────────────────────
  if (responsePayload === null || responsePayload === undefined) {
    return buildResult(toolName, outputContentType, timestamp, [
      { check: 'Response payload is not null', passed: false, error: 'Response payload is null or undefined.' },
    ]);
  }

  if (typeof responsePayload !== 'object' || Array.isArray(responsePayload)) {
    return buildResult(toolName, outputContentType, timestamp, [
      {
        check: 'Response payload is an object',
        passed: false,
        error: `Expected an object but received ${Array.isArray(responsePayload) ? 'array' : typeof responsePayload}.`,
      },
    ]);
  }

  // ── Validate with AJV ──────────────────────────────────────────────────
  let validate: ValidateFunction;
  try {
    validate = getValidator(schemaFile);
  } catch (err) {
    return makeErrorResult(
      toolName,
      outputContentType,
      timestamp,
      err instanceof Error ? err.message : 'Failed to load validation schema.',
    );
  }

  const isValid = validate(responsePayload);

  const checks: ValidationCheck[] = [];

  // High-level structural pass checks
  checks.push({ check: 'Schema resolved for output content-type', passed: true });
  checks.push({ check: 'Response payload is an object', passed: true });

  if (isValid) {
    checks.push({ check: 'AJV schema validation passed', passed: true });
  } else {
    const errors = validate.errors ?? [];
    for (const err of errors) {
      checks.push(ajvErrorToCheck(err));
    }
  }

  return buildResult(toolName, outputContentType, timestamp, checks);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ajvErrorToCheck(err: ErrorObject): ValidationCheck {
  const path = err.instancePath || '/';
  const params = err.params as Record<string, unknown>;

  switch (err.keyword) {
    case 'required': {
      const missing = params.missingProperty as string;
      const location = path === '/' ? '' : path;
      return {
        check: `${location}${location ? '.' : ''}${missing} is required`,
        passed: false,
        path: `${path}/${missing}`.replace(/^\/\//, '/'),
        error: `Missing required field '${missing}'`,
      };
    }

    case 'enum': {
      const allowed = (params.allowedValues as string[]) ?? [];
      const value = err.data as unknown;
      return {
        check: `${path} is valid enum`,
        passed: false,
        path,
        error: `Value '${String(value)}' is not one of: ${allowed.join(', ')}`,
      };
    }

    case 'type': {
      const expected = params.type as string;
      const actual = Array.isArray(err.data) ? 'array' : typeof err.data;
      return {
        check: `${path} has correct type`,
        passed: false,
        path,
        error: `Expected type '${expected}' but got '${actual}'`,
      };
    }

    case 'minimum': {
      const limit = params.limit as number;
      return {
        check: `${path} in range [${limit},...]`,
        passed: false,
        path,
        error: `Value ${String(err.data)} is less than minimum ${limit}`,
      };
    }

    case 'maximum': {
      const limit = params.limit as number;
      return {
        check: `${path} in range [...,${limit}]`,
        passed: false,
        path,
        error: `Value ${String(err.data)} exceeds maximum ${limit}`,
      };
    }

    case 'additionalProperties': {
      const extra = params.additionalProperty as string;
      return {
        check: `${path} has no unexpected properties`,
        passed: false,
        path: `${path}/${extra}`.replace(/^\/\//, '/'),
        error: `Unexpected property '${extra}'`,
      };
    }

    case 'minItems': {
      const limit = params.limit as number;
      return {
        check: `${path} has at least ${limit} item(s)`,
        passed: false,
        path,
        error: `Array has fewer than ${limit} required item(s)`,
      };
    }

    case 'format': {
      const format = params.format as string;
      return {
        check: `${path} matches format '${format}'`,
        passed: false,
        path,
        error: `Value does not match expected format '${format}'`,
      };
    }

    default:
      return {
        check: `${path}: ${err.keyword}`,
        passed: false,
        path,
        error: err.message ?? `Validation failed: ${err.keyword}`,
      };
  }
}

function makeErrorResult(
  toolName: string,
  outputContentType: string,
  timestamp: string,
  errorMessage: string,
): ValidationResult {
  return buildResult(toolName, outputContentType, timestamp, [
    { check: 'Pre-validation', passed: false, error: errorMessage },
  ]);
}

function buildResult(
  toolName: string,
  outputContentType: string,
  timestamp: string,
  checks: ValidationCheck[],
): ValidationResult {
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  return {
    valid: failed === 0,
    toolName,
    outputContentType,
    checks,
    summary: { passed, failed },
    timestamp,
  };
}
