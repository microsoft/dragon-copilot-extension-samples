/// <reference types="node" />

import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DragonExtensionManifest, PublisherConfig } from '../domains/extension/types.js';
import type { PartnerIntegrationManifest } from '../domains/partner/types.js';

type ManifestLike = DragonExtensionManifest | PartnerIntegrationManifest;

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
  const isTestEnvironment = process?.env?.NODE_ENV === 'test' ||
                           process?.env?.JEST_WORKER_ID !== undefined ||
                           currentDir.includes('__tests__') ||
                           currentDir.includes('test');

  if (isTestEnvironment) {
    return resolve(currentDir, '..', 'schemas');
  }

  if (currentDir.includes('dist')) {
    return resolve(currentDir, '..', 'schemas');
  }

  return resolve(currentDir, '..', 'schemas');
}

const schemaDir = getSchemaPath();
const extensionManifestSchema = JSON.parse(readFileSync(join(schemaDir, 'extension-manifest.json'), 'utf8'));
const partnerManifestSchema = JSON.parse(readFileSync(join(schemaDir, 'partner-manifest.json'), 'utf8'));
const publisherSchema = JSON.parse(readFileSync(join(schemaDir, 'publisher-config.json'), 'utf8'));

const validateExtensionSchema = ajv.compile(extensionManifestSchema);
const validatePartnerSchema = ajv.compile(partnerManifestSchema);
const validatePublisherSchemaInternal = ajv.compile(publisherSchema);

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

export function validatePartnerManifest(manifest: PartnerIntegrationManifest): ValidationResult {
  const schemaResult = validatePartnerManifestSchema(manifest);
  const businessRuleErrors = validateExtensionBusinessRules(manifest);

  return {
    isValid: schemaResult.isValid && businessRuleErrors.length === 0,
    errors: [...schemaResult.errors, ...businessRuleErrors]
  };
}

export function validatePublisherConfig(config: PublisherConfig): ValidationResult {
  return validatePublisherSchema(config);
}

export function validateExtensionManifestSchema(manifest: DragonExtensionManifest): ValidationResult {
  const isValid = validateExtensionSchema(manifest);
  return {
    isValid,
    errors: isValid ? [] : (validateExtensionSchema.errors || []).map(convertAjvError)
  };
}

export function validatePartnerManifestSchema(manifest: PartnerIntegrationManifest): ValidationResult {
  const isValid = validatePartnerSchema(manifest);
  return {
    isValid,
    errors: isValid ? [] : (validatePartnerSchema.errors || []).map(convertAjvError)
  };
}

export function validatePublisherSchema(config: PublisherConfig): ValidationResult {
  const isValid = validatePublisherSchemaInternal(config);
  return {
    isValid,
    errors: isValid ? [] : (validatePublisherSchemaInternal.errors || []).map(convertAjvError)
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

  const automationScripts = Array.isArray((manifest as any).automationScripts)
    ? (manifest as any).automationScripts
    : [];

  if (automationScripts.length > 1) {
    const scriptNames = automationScripts.map((script: any) => script?.name).filter(Boolean);
    const duplicateScripts = scriptNames.filter((name: string, index: number) => scriptNames.indexOf(name) !== index);

    if (duplicateScripts.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateScripts)];
      errors.push({
        instancePath: '/automationScripts',
        keyword: 'uniqueAutomationScriptNames',
        message: `Duplicate automation script names found: ${uniqueDuplicates.join(', ')}`,
        data: automationScripts,
        schemaPath: '#/automationScripts',
        params: { duplicates: uniqueDuplicates }
      });
    }
  }

  const eventTriggers = Array.isArray((manifest as any).eventTriggers)
    ? (manifest as any).eventTriggers
    : [];

  if (eventTriggers.length > 1) {
    const triggerNames = eventTriggers.map((trigger: any) => trigger?.name).filter(Boolean);
    const duplicateTriggers = triggerNames.filter((name: string, index: number) => triggerNames.indexOf(name) !== index);

    if (duplicateTriggers.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateTriggers)];
      errors.push({
        instancePath: '/eventTriggers',
        keyword: 'uniqueEventTriggerNames',
        message: `Duplicate event trigger names found: ${uniqueDuplicates.join(', ')}`,
        data: eventTriggers,
        schemaPath: '#/eventTriggers',
        params: { duplicates: uniqueDuplicates }
      });
    }
  }

  if (eventTriggers.length > 0) {
    const scriptNames = new Set(automationScripts.map((script: any) => script?.name).filter(Boolean));

    eventTriggers.forEach((trigger: any) => {
      if (trigger?.scriptName && !scriptNames.has(trigger.scriptName)) {
        errors.push({
          instancePath: '/eventTriggers',
          keyword: 'missingAutomationScript',
          message: `Event trigger '${trigger?.name ?? 'unknown'}' references unknown script '${trigger?.scriptName}'`,
          data: trigger,
          schemaPath: '#/eventTriggers/items',
          params: {
            trigger: trigger?.name,
            script: trigger?.scriptName
          }
        });
      }
    });
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
  schemaType: 'extension-manifest' | 'partner-manifest' | 'publisher'
): string | true {
  const schema =
    schemaType === 'extension-manifest'
      ? extensionManifestSchema
      : schemaType === 'partner-manifest'
        ? partnerManifestSchema
        : publisherSchema;
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

export { extensionManifestSchema, partnerManifestSchema, publisherSchema };
