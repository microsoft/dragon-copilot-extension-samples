import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { DragonExtensionManifest, PublisherConfig } from '../types.js';
import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Initialize AJV with format support
const ajv = new Ajv({ allErrors: true, strict: false });
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
  
  // Check if we're in a test environment by looking for common test indicators
  const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                           process.env.JEST_WORKER_ID !== undefined ||
                           currentDir.includes('__tests__') ||
                           currentDir.includes('test');
  
  if (isTestEnvironment) {
    // In test environment, always look relative to src
    return resolve(currentDir, '..', 'schemas');
  }
  
  // Check if we're in the dist directory (built/packaged)
  if (currentDir.includes('dist')) {
    return resolve(currentDir, '..', 'schemas');
  } else {
    // We're in development (src directory)
    return resolve(currentDir, '..', 'schemas');
  }
}

const schemaDir = getSchemaPath();
const manifestSchema = JSON.parse(readFileSync(join(schemaDir, 'extension-manifest.json'), 'utf8'));
const publisherSchema = JSON.parse(readFileSync(join(schemaDir, 'publisher-config.json'), 'utf8'));

// Compile schemas for faster validation
const validateManifest = ajv.compile(manifestSchema);
const validatePublisher = ajv.compile(publisherSchema);

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
 * Complete validation for Extension Manifest
 * Combines JSON Schema validation with simple business rules
 */
export function validateExtensionManifest(manifest: DragonExtensionManifest): ValidationResult {
  // Step 1: Pure JSON Schema validation
  const schemaResult = validateManifestSchema(manifest);

  // Step 2: Simple business rules (easily portable to C#)
  const businessRuleErrors = validateManifestBusinessRules(manifest);

  return {
    isValid: schemaResult.isValid && businessRuleErrors.length === 0,
    errors: [...schemaResult.errors, ...businessRuleErrors]
  };
}

/**
 * Complete validation for Publisher Configuration
 * Pure JSON Schema validation (no additional business rules needed)
 */
export function validatePublisherConfig(config: PublisherConfig): ValidationResult {
  return validatePublisherSchema(config);
}

/**
 * Pure JSON Schema validation for Extension Manifest
 */
export function validateManifestSchema(manifest: DragonExtensionManifest): ValidationResult {
  const isValid = validateManifest(manifest);

  return {
    isValid,
    errors: isValid ? [] : (validateManifest.errors || []).map(convertAjvError)
  };
}

/**
 * Pure JSON Schema validation for Publisher Configuration
 */
export function validatePublisherSchema(config: PublisherConfig): ValidationResult {
  const isValid = validatePublisher(config);

  return {
    isValid,
    errors: isValid ? [] : (validatePublisher.errors || []).map(convertAjvError)
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
 * Field validation for prompts
 */
export function validateFieldValue(value: any, fieldPath: string, schemaType: 'manifest' | 'publisher'): string | true {
  const schema = schemaType === 'manifest' ? manifestSchema : publisherSchema;
  const fieldSchema = extractFieldSchema(fieldPath, schema);

  if (!fieldSchema) {
    return true;
  }

  const tempValidator = ajv.compile(fieldSchema);
  const isValid = tempValidator(value);

  if (!isValid && tempValidator.errors && tempValidator.errors.length > 0) {
    return tempValidator.errors[0].message || 'Validation failed';
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
    if (currentSchema.properties && currentSchema.properties[part]) {
      currentSchema = currentSchema.properties[part];
    } else if (currentSchema.definitions && currentSchema.definitions[part]) {
      currentSchema = currentSchema.definitions[part];
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
    'countries': 'Countries'
  };

  return fieldNames[path] || path;
}

// Export schemas for external use (e.g., documentation generation)
export { manifestSchema, publisherSchema };
