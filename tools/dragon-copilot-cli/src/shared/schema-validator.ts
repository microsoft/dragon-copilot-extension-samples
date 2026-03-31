/// <reference types="node" />

import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DragonExtensionManifest } from '../domains/physician/types.js';
import type { ConnectorIntegrationManifest } from '../domains/connector/types.js';

type ManifestLike = DragonExtensionManifest | ConnectorIntegrationManifest;

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function getCurrentModuleDir(): string {
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
  } catch {}

  try {
  const importMeta = (globalThis as any).import?.meta;
    if (importMeta?.url) {
      const fileUrl = importMeta.url;
      if (typeof fileUrl === 'string' && fileUrl.startsWith('file:')) {
        const __filename = fileURLToPath(fileUrl);
        return dirname(__filename);
      }
    }
  } catch {}

  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  return resolve(process.cwd(), 'src', 'shared');
}

function getSchemaPath(): string {
  const currentDir = getCurrentModuleDir();

  const candidates = [
    // Bundle: schemas sit next to the bundle file in dist/schemas/
    resolve(currentDir, 'schemas'),
    // Development/test: schema-validator lives one level below schemas
    resolve(currentDir, '..', 'schemas'),
    resolve(currentDir, '..', '..', 'schemas'),
    resolve(currentDir, '..', '..', '..', 'schemas'),
    resolve(process.cwd(), 'src', 'schemas'),
    resolve(process.cwd(), 'dist', 'schemas'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'extension-manifest.json'))) {
      return candidate;
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

const extensionManifestSchema = loadSchema('extension-manifest.json');
const connectorManifestSchema = loadSchema('connector-manifest.json');

const validateExtensionSchema = ajv.compile(extensionManifestSchema);
const validateConnectorSchema = ajv.compile(connectorManifestSchema);

export interface SchemaError {
  instancePath: string;
  keyword: string;
  message: string;
  data?: unknown;
  schemaPath: string;
  params: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: SchemaError[];
}

export function validateExtensionManifest(manifest: DragonExtensionManifest): ValidationResult {
  const schemaResult = validateExtensionManifestSchema(manifest);
  const businessRuleErrors = validateExtensionBusinessRules(manifest);

  return {
    isValid: schemaResult.isValid && businessRuleErrors.length === 0,
    errors: [...schemaResult.errors, ...businessRuleErrors]
  };
}

export function validateConnectorManifest(manifest: ConnectorIntegrationManifest): ValidationResult {
  const schemaResult = validateConnectorManifestSchema(manifest);
  const businessRuleErrors = validateConnectorBusinessRules(manifest);

  return {
    isValid: schemaResult.isValid && businessRuleErrors.length === 0,
    errors: [...schemaResult.errors, ...businessRuleErrors]
  };
}

export function validateExtensionManifestSchema(manifest: DragonExtensionManifest): ValidationResult {
  const isValid = validateExtensionSchema(manifest);
  return {
    isValid,
    errors: isValid ? [] : (validateExtensionSchema.errors || []).map(convertAjvError)
  };
}

export function validateConnectorManifestSchema(manifest: ConnectorIntegrationManifest): ValidationResult {
  const isValid = validateConnectorSchema(manifest);
  return {
    isValid,
    errors: isValid ? [] : (validateConnectorSchema.errors || []).map(convertAjvError)
  };
}

function validateExtensionBusinessRules(manifest: ManifestLike): SchemaError[] {
  const errors: SchemaError[] = [];
  const tools = Array.isArray((manifest as any).tools) ? (manifest as any).tools : [];

  if (tools.length > 1) {
    const toolNames = tools.map((tool: any) => tool?.name).filter(Boolean);
    const duplicates = toolNames.filter((name: string, index: number) => toolNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      errors.push({
        instancePath: '/tools',
        keyword: 'uniqueToolNames',
        message: `Duplicate tool names found: ${uniqueDuplicates.join(', ')}`,
        data: tools,
        schemaPath: '#/tools',
        params: { duplicates: uniqueDuplicates }
      });
    }
  }

  return errors;
}

function validateConnectorBusinessRules(manifest: ConnectorIntegrationManifest): SchemaError[] {
  const errors: SchemaError[] = [];

  // Check for duplicate server-authentication issuers
  const serverAuth = Array.isArray((manifest as any)['server-authentication'])
    ? (manifest as any)['server-authentication']
    : [];

  if (serverAuth.length > 1) {
    const issuers = serverAuth.map((entry: any) => entry?.issuer).filter(Boolean);
    const duplicateIssuers = issuers.filter((issuer: string, index: number) => issuers.indexOf(issuer) !== index);

    if (duplicateIssuers.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateIssuers)];
      errors.push({
        instancePath: '/server-authentication',
        keyword: 'uniqueIssuers',
        message: `Duplicate server-authentication issuers found: ${uniqueDuplicates.join(', ')}`,
        data: serverAuth,
        schemaPath: '#/server-authentication',
        params: { duplicates: uniqueDuplicates }
      });
    }
  }

  return errors;
}

function convertAjvError(ajvError: ErrorObject): SchemaError {
  return {
    instancePath: ajvError.instancePath || '',
    keyword: ajvError.keyword || 'unknown',
    message: ajvError.message || '',
    data: ajvError.data,
    schemaPath: ajvError.schemaPath || '',
    params: ajvError.params as Record<string, unknown>
  };
}

export function validateFieldValue(
  value: unknown,
  fieldPath: string,
  schemaType: 'extension-manifest' | 'connector-manifest'
): string | true {
  const schema =
    schemaType === 'extension-manifest'
      ? extensionManifestSchema
      : connectorManifestSchema;
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

    if (currentSchema.properties && currentSchema.properties[part]) {
      currentSchema = currentSchema.properties[part];
    } else if (currentSchema.definitions && currentSchema.definitions[part]) {
      currentSchema = currentSchema.definitions[part];
    } else if (currentSchema[part]) {
      currentSchema = currentSchema[part];
    } else {
      return null;
    }
  }

  return currentSchema;
}

export function getFieldDisplayName(path: string): string {
  const fieldNames: Record<string, string> = {
    publisherId: 'Publisher ID',
    publisherName: 'Publisher Name',
    websiteUrl: 'Website URL',
    privacyPolicyUrl: 'Privacy Policy URL',
    supportUrl: 'Support URL',
    contactEmail: 'Contact Email',
    offerId: 'Offer ID',
    defaultLocale: 'Default Locale',
    supportedLocales: 'Supported Locales',
    regions: 'Regions'
  };

  return fieldNames[path] || path;
}

export { extensionManifestSchema, connectorManifestSchema };
