import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { DragonExtensionManifest, PublisherConfig } from '../types.js';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

// Initialize AJV with format support
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Load schemas from source directory (works in both test and runtime)
const schemaDir = resolve(process.cwd(), 'src', 'schemas');
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
