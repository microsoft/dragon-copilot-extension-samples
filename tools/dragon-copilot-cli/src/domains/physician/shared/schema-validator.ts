import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';
import type { DragonExtensionManifest } from '../types.js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

type AjvConstructor = typeof import('ajv').default;
type AjvInstance = InstanceType<AjvConstructor>;
type AddFormatsFn = (ajv: AjvInstance) => unknown;

const AjvClass: AjvConstructor =
  (AjvModule as { default?: AjvConstructor }).default ?? (AjvModule as unknown as AjvConstructor);

const addFormats: AddFormatsFn =
  (addFormatsModule as { default?: AddFormatsFn }).default ?? (addFormatsModule as unknown as AddFormatsFn);

// Initialize AJV with format support
const ajv = new AjvClass({ allErrors: true, strict: false });
addFormats(ajv);

// Get the directory of the current module - with fallback for test environments
function getCurrentModuleDir(): string {
  // Try using the stack trace approach first, as it's more reliable
  try {
    const stack = new Error().stack;
    if (stack) {
      // Look for this file in the stack trace
      const match = stack.match(/at .*? \((.+?):\d+:\d+\)/);
      if (match && match[1]) {
        let filePath = match[1];

        // Convert file URL to path if necessary
        if (filePath.startsWith('file:///')) {
          filePath = fileURLToPath(filePath);
        }

        // Make sure it's a valid file path and contains our module
        if (filePath.includes('schema-validator') || filePath.includes('dist') || filePath.includes('src')) {
          return dirname(filePath);
        }
      }
    }
  } catch (error) {
    // Continue to other methods
  }

  try {
    // Try import.meta.url approach (works in most environments)
    // Use type assertion to avoid TypeScript module target issues
    const importMeta = (globalThis as any).import?.meta || (global as any).import?.meta;
    if (importMeta?.url) {
      // Make sure we have a proper file URL before converting
      let fileUrl = importMeta.url;
      if (typeof fileUrl === 'string' && fileUrl.startsWith('file:')) {
        const __filename = fileURLToPath(fileUrl);
        return dirname(__filename);
      }
    }
  } catch (error) {
    // Fallback for test environments or other edge cases
  }

  // Fallback: use __dirname if available (CommonJS)
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // If all else fails, fall back to process.cwd() with src assumption
  return resolve(process.cwd(), 'src', 'shared');
}

// Load schemas from the correct location - works in development, built, and test environments
function getSchemaPath(): string {
  const currentDir = getCurrentModuleDir();

  const candidates = [
    // Bundle: schemas sit next to the bundle file in dist/schemas/
    resolve(currentDir, 'schemas'),
    resolve(currentDir, '..', 'schemas'),
    resolve(currentDir, '..', '..', 'schemas'),
    // Handle scenarios where CLI is invoked from another working directory (e.g., packaging script)
    // and the compiled files live under dist/schemas instead of the domain subfolder.
    resolve(currentDir, '..', '..', '..', 'schemas'),
    resolve(process.cwd(), 'src', 'schemas'),
    resolve(process.cwd(), 'dist', 'schemas'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'physician', 'physician-extension-manifest-schema.json'))) {
      return join(candidate, 'physician');
    }
  }

  return resolve(currentDir, '..', 'schemas');
}

const schemaDir = getSchemaPath();

function loadSchema(name: string): any {
  // Use embedded schemas when available (bundled/SEA mode)
  if (typeof globalThis !== 'undefined' && (globalThis as any).__EMBEDDED_SCHEMAS__?.[name]) {
    return (globalThis as any).__EMBEDDED_SCHEMAS__[name];
  }
  // Fall back to filesystem loading (development/built mode)
  return JSON.parse(readFileSync(join(schemaDir, name), 'utf8'));
}

/** Selector for manifests that omit `schemaVersion`. */
export const LEGACY_SCHEMA_VERSION = 'legacy';

interface SchemaVersionEntry {
  version: string;
  file: string;
  /** Preview versions are accepted by validate but never chosen as the default. */
  preview?: boolean;
}

// Ordered oldest to newest. Adding a version only requires a new schema file and an entry here.
const SCHEMA_VERSION_REGISTRY: SchemaVersionEntry[] = [
  { version: '0.3.0', file: 'physician-extension-manifest-schema-0.3.0.json' },
];

const LEGACY_SCHEMA_FILE = 'physician-extension-manifest-schema.json';

const manifestSchema = loadSchema(LEGACY_SCHEMA_FILE);
const validateLegacyManifest = ajv.compile(manifestSchema);

// Each versioned schema declares a unique `$id`, so it must be compiled exactly once per Ajv instance.
const versionedSchemas = new Map<string, { schema: any; validate: ReturnType<typeof ajv.compile> }>(
  SCHEMA_VERSION_REGISTRY.map(entry => {
    const schema = loadSchema(entry.file);
    return [entry.version, { schema, validate: ajv.compile(schema) }];
  })
);

export const LATEST_SCHEMA_VERSION: string =
  [...SCHEMA_VERSION_REGISTRY].reverse().find(entry => !entry.preview)?.version ?? LEGACY_SCHEMA_VERSION;

export interface SchemaVersionInfo {
  version: string;
  latest: boolean;
  preview: boolean;
  deprecated: boolean;
}

/** All selectable schema versions, newest first, including `legacy`. */
export function getSchemaVersions(): SchemaVersionInfo[] {
  const versioned = [...SCHEMA_VERSION_REGISTRY].reverse().map(entry => ({
    version: entry.version,
    latest: entry.version === LATEST_SCHEMA_VERSION,
    preview: entry.preview === true,
    deprecated: false
  }));
  return [...versioned, { version: LEGACY_SCHEMA_VERSION, latest: false, preview: false, deprecated: true }];
}

export function isSupportedSchemaVersion(version: string): boolean {
  return version === LEGACY_SCHEMA_VERSION || versionedSchemas.has(version);
}

/** Resolves a `--schema-version` option to a supported version, defaulting to the latest. */
export function resolveRequestedSchemaVersion(requested?: string): string {
  const version = requested ?? LATEST_SCHEMA_VERSION;
  if (!isSupportedSchemaVersion(version)) {
    const supported = getSchemaVersions().map(v => v.version).join(', ');
    throw new Error(`Unsupported schema version "${version}". Supported: ${supported}`);
  }
  return version;
}

/**
 * Reads the manifest's `schemaVersion`. Returns `legacy` when it's absent. A present but
 * non-string or empty value is returned as-is so it's reported as unsupported rather than
 * silently validated against the legacy schema.
 */
export function getManifestSchemaVersion(manifest: unknown): string {
  if (!manifest || typeof manifest !== 'object' || !('schemaVersion' in manifest)) {
    return LEGACY_SCHEMA_VERSION;
  }
  const value = (manifest as Record<string, unknown>).schemaVersion;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function getSchemaForVersion(version: string): any {
  return version === LEGACY_SCHEMA_VERSION ? manifestSchema : versionedSchemas.get(version)?.schema;
}

/**
 * Schema validation error (directly from AJV)
 */
export interface SchemaError {
  instancePath: string;
  keyword: string;
  message: string;
  data?: any;
  schemaPath: string;
  params: any;
}

/**
 * Simplified validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: SchemaError[];
  /** Schema version the manifest was validated against (`legacy` when `schemaVersion` is absent). */
  schemaVersion?: string;
}

/**
 * Complete validation for Extension Manifest
 * Combines JSON Schema validation with simple business rules
 */
export function validateExtensionManifest(manifest: unknown): ValidationResult {
  // Step 1: Pure JSON Schema validation
  const schemaResult = validateManifestSchema(manifest);
  // Business rules assume a schema-valid shape, so they would crash on malformed input.
  if (!schemaResult.isValid) {
    return schemaResult;
  }

  // Step 2: Simple business rules (easily portable to C#)
  const businessRuleErrors = validateManifestBusinessRules(manifest as DragonExtensionManifest);

  return { ...schemaResult, isValid: businessRuleErrors.length === 0, errors: businessRuleErrors };
}

/**
 * Pure JSON Schema validation for Extension Manifest. Picks the schema from `schemaVersion`;
 * `schemaVersion` is undefined in the result when the declared version isn't supported.
 */
export function validateManifestSchema(manifest: unknown): ValidationResult {
  const version = getManifestSchemaVersion(manifest);
  const validator = version === LEGACY_SCHEMA_VERSION
    ? validateLegacyManifest
    : versionedSchemas.get(version)?.validate;

  if (!validator) {
    const supported = SCHEMA_VERSION_REGISTRY.map(entry => entry.version).join(', ');
    return {
      isValid: false,
      errors: [{
        instancePath: '/schemaVersion',
        keyword: 'unsupportedSchemaVersion',
        message: `Unsupported schema version "${version}". Supported: ${supported} (or omit schemaVersion for the original format)`,
        data: (manifest as Record<string, unknown>).schemaVersion,
        schemaPath: '#/properties/schemaVersion',
        params: { schemaVersion: version, supported: SCHEMA_VERSION_REGISTRY.map(entry => entry.version) }
      }]
    };
  }

  const isValid = validator(manifest) as boolean;

  return {
    isValid,
    errors: isValid ? [] : (validator.errors || []).map(convertAjvError),
    schemaVersion: version
  };
}

/**
 * Simple business rules for Extension Manifest
 * These are rules that can't be expressed in JSON Schema but are simple enough
 * to be easily replicated in C#
 */
function validateManifestBusinessRules(manifest: DragonExtensionManifest): SchemaError[] {
  const errors: SchemaError[] = [];

  // Check for duplicate tool names
  if (Array.isArray(manifest?.tools) && manifest.tools.length > 1) {
    const toolNames = manifest.tools.map((t: { name?: string } | null) => t?.name).filter(Boolean);
    const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      errors.push({
        instancePath: '/tools',
        keyword: 'uniqueToolNames',
        message: `Duplicate tool names found: ${[...new Set(duplicates)].join(', ')}`,
        data: manifest.tools,
        schemaPath: '#/tools',
        params: { duplicates: [...new Set(duplicates)] }
      });
    }
  }

  return errors;
}

/**
 * Converts AJV error to our standard schema error format
 */
function convertAjvError(ajvError: any): SchemaError {
  return {
    instancePath: ajvError.instancePath || '',
    keyword: ajvError.keyword,
    message: ajvError.message || '',
    data: ajvError.data,
    schemaPath: ajvError.schemaPath || '',
    params: ajvError.params || {}
  };
}

/**
 * Field validation for prompts, against the schema for the given version (default: latest).
 * `fieldPath` is a top-level property name or a dotted path into the schema (e.g. `definitions.Tool.properties.name`).
 */
export function validateFieldValue(
  value: any,
  fieldPath: string,
  schemaType: 'manifest',
  schemaVersion: string = LATEST_SCHEMA_VERSION
): string | true {
  const schema = getSchemaForVersion(schemaVersion) ?? manifestSchema;
  const fieldSchema = extractFieldSchema(fieldPath, schema);

  if (!fieldSchema) {
    return true;
  }

  const tempValidator = ajv.compile(fieldSchema);
  const isValid = tempValidator(value);

  if (!isValid && tempValidator.errors && tempValidator.errors.length > 0) {
    const [firstError] = tempValidator.errors;
    return firstError?.message || 'Validation failed';
  }

  return true;
}

/**
 * Extracts a field schema from the main schema using JSON path
 */
function extractFieldSchema(fieldPath: string, schema: any): any | null {
  const pathParts = fieldPath.split('.');
  let currentSchema = schema;

  for (const part of pathParts) {
    if (part === 'definitions' && currentSchema.definitions) {
      currentSchema = currentSchema.definitions;
      continue;
    }

    if (part === 'properties' && currentSchema.properties) {
      currentSchema = currentSchema.properties;
      continue;
    }

    if (part === 'items' && currentSchema.items) {
      currentSchema = currentSchema.items;
      continue;
    }

    if (currentSchema && typeof currentSchema === 'object' && part in currentSchema) {
      currentSchema = currentSchema[part];
    } else if (currentSchema?.properties && part in currentSchema.properties) {
      currentSchema = currentSchema.properties[part];
    } else {
      return null;
    }
  }

  return currentSchema;
}

/**
 * Helper function to get user-friendly field names
 */
export function getFieldDisplayName(path: string): string {
  const fieldNames: { [key: string]: string } = {
    'publisherId': 'Publisher ID',
    'publisherName': 'Publisher Name',
    'websiteUrl': 'Website URL',
    'privacyPolicyUrl': 'Privacy Policy URL',
    'supportUrl': 'Support URL',
    'contactEmail': 'Contact Email',
    'offerId': 'Offer ID',
    'defaultLocale': 'Default Locale',
    'supportedLocales': 'Supported Locales',
    'regions': 'Regions'
  };

  return fieldNames[path] || path;
}

// Export schemas for external use (e.g., documentation generation)
export { manifestSchema };
