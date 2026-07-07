import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';
import type { DcrExtensionManifest } from '../types.js';
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
      const match = stack.match(/at .*? \((.+?):\d+:\d+\)/);
      if (match && match[1]) {
        let filePath = match[1];

        if (filePath.startsWith('file:///')) {
          filePath = fileURLToPath(filePath);
        }

        if (filePath.includes('schema-validator') || filePath.includes('dist') || filePath.includes('src')) {
          return dirname(filePath);
        }
      }
    }
  } catch (error) {
    // Continue to other methods
  }

  try {
    const importMeta = (globalThis as any).import?.meta || (global as any).import?.meta;
    if (importMeta?.url) {
      let fileUrl = importMeta.url;
      if (typeof fileUrl === 'string' && fileUrl.startsWith('file:')) {
        const __filename = fileURLToPath(fileUrl);
        return dirname(__filename);
      }
    }
  } catch (error) {
    // Fallback for test environments or other edge cases
  }

  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  return resolve(process.cwd(), 'src', 'shared');
}

// Load schemas from the correct location
function getSchemaPath(): string {
  const currentDir = getCurrentModuleDir();

  const candidates = [
    resolve(currentDir, 'schemas'),
    resolve(currentDir, '..', 'schemas'),
    resolve(currentDir, '..', '..', 'schemas'),
    resolve(currentDir, '..', '..', '..', 'schemas'),
    resolve(process.cwd(), 'src', 'schemas'),
    resolve(process.cwd(), 'dist', 'schemas'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'radiologists', 'radiologists-extension-manifest-schema.json'))) {
      return join(candidate, 'radiologists');
    }
  }

  return resolve(currentDir, '..', 'schemas');
}

const schemaDir = getSchemaPath();

function loadSchema(name: string): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__EMBEDDED_SCHEMAS__?.[name]) {
    return (globalThis as any).__EMBEDDED_SCHEMAS__[name];
  }
  return JSON.parse(readFileSync(join(schemaDir, name), 'utf8'));
}

const manifestSchema = loadSchema('radiologists-extension-manifest-schema.json');

const validateManifest = ajv.compile(manifestSchema);

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
}

/**
 * Complete validation for DCR Extension Manifest
 */
export function validateExtensionManifest(manifest: DcrExtensionManifest): ValidationResult {
  const schemaResult = validateManifestSchema(manifest);
  const businessRuleErrors = validateManifestBusinessRules(manifest);

  return {
    isValid: schemaResult.isValid && businessRuleErrors.length === 0,
    errors: [...schemaResult.errors, ...businessRuleErrors]
  };
}

/**
 * Pure JSON Schema validation for DCR Extension Manifest
 */
export function validateManifestSchema(manifest: DcrExtensionManifest): ValidationResult {
  const isValid = validateManifest(manifest);

  return {
    isValid,
    errors: isValid ? [] : (validateManifest.errors || []).map(convertAjvError)
  };
}

/**
 * Simple business rules for DCR Extension Manifest
 */
function validateManifestBusinessRules(manifest: DcrExtensionManifest): SchemaError[] {
  const errors: SchemaError[] = [];

  if (manifest.tools && manifest.tools.length > 1) {
    const toolNames = manifest.tools.map(t => t.name).filter(Boolean);
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
 * Field validation for prompts
 */
export function validateFieldValue(value: any, fieldPath: string, schemaType: 'manifest'): string | true {
  const schema = manifestSchema;
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

    // Prefer navigating into properties first (for top-level field lookups)
    if (currentSchema.properties && currentSchema.properties[part]) {
      currentSchema = currentSchema.properties[part];
    } else if (currentSchema.definitions && currentSchema.definitions[part]) {
      currentSchema = currentSchema.definitions[part];
    } else if (currentSchema && typeof currentSchema === 'object' && part in currentSchema) {
      currentSchema = currentSchema[part];
    } else {
      return null;
    }
  }

  // Ensure the result is a valid schema object
  if (typeof currentSchema !== 'object' || currentSchema === null) {
    return null;
  }

  return currentSchema;
}

export { manifestSchema };
