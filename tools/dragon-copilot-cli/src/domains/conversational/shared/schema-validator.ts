import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ConversationalManifest } from '../types.js';

type AjvConstructor = typeof import('ajv').default;
type AjvInstance = InstanceType<AjvConstructor>;
type AddFormatsFn = (ajv: AjvInstance) => unknown;

const AjvClass: AjvConstructor =
  (AjvModule as { default?: AjvConstructor }).default ?? (AjvModule as unknown as AjvConstructor);

const addFormats: AddFormatsFn =
  (addFormatsModule as { default?: AddFormatsFn }).default ?? (addFormatsModule as unknown as AddFormatsFn);

const SCHEMA_FILE = 'conversational-extension-manifest-schema.json';

const ajv = new AjvClass({ allErrors: true, strict: false });
addFormats(ajv);

// Same lookup strategy as the other domains: works from src (ts-jest), dist and the bundled binary.
function getCurrentModuleDir(): string {
  try {
    const stack = new Error().stack;
    const match = stack?.match(/at .*? \((.+?):\d+:\d+\)/);
    if (match && match[1]) {
      let filePath = match[1];
      if (filePath.startsWith('file:///')) {
        filePath = fileURLToPath(filePath);
      }
      if (filePath.includes('schema-validator') || filePath.includes('dist') || filePath.includes('src')) {
        return dirname(filePath);
      }
    }
  } catch {
    // fall through
  }

  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  return resolve(process.cwd(), 'src', 'shared');
}

function getSchemaDir(): string {
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
    if (existsSync(join(candidate, 'conversational', SCHEMA_FILE))) {
      return join(candidate, 'conversational');
    }
  }

  return resolve(currentDir, '..', 'schemas', 'conversational');
}

function loadSchema(): any {
  const embedded = (globalThis as any).__EMBEDDED_SCHEMAS__?.[`conversational/${SCHEMA_FILE}`];
  if (embedded) {
    return embedded;
  }
  return JSON.parse(readFileSync(join(getSchemaDir(), SCHEMA_FILE), 'utf8'));
}

const manifestSchema = loadSchema();
const compiledValidator = ajv.compile(manifestSchema);

export interface SchemaError {
  instancePath: string;
  keyword: string;
  message: string;
  schemaPath: string;
  params: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: SchemaError[];
  warnings: string[];
}

/**
 * JSON Schema validation plus business rules that JSON Schema cannot express.
 */
export function validateConversationalManifest(manifest: unknown): ValidationResult {
  const schemaValid = compiledValidator(manifest);
  const schemaErrors = schemaValid ? [] : (compiledValidator.errors ?? []).map(convertAjvError);
  const ruleErrors = validateBusinessRules(manifest as ConversationalManifest);

  return {
    isValid: schemaValid && ruleErrors.length === 0,
    errors: [...schemaErrors, ...ruleErrors],
    warnings: collectWarnings(manifest as ConversationalManifest),
  };
}

function validateBusinessRules(manifest: ConversationalManifest): SchemaError[] {
  const errors: SchemaError[] = [];
  const tools = Array.isArray(manifest?.tools) ? manifest.tools : [];

  const names = tools.map(t => t?.name).filter((n): n is string => typeof n === 'string');
  const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
  if (duplicates.length > 0) {
    errors.push({
      instancePath: '/tools',
      keyword: 'uniqueToolNames',
      message: `Duplicate tool names found: ${duplicates.join(', ')}`,
      schemaPath: '#/properties/tools',
      params: { duplicates },
    });
  }

  return errors;
}

function collectWarnings(manifest: ConversationalManifest): string[] {
  const warnings: string[] = [];
  const tools = Array.isArray(manifest?.tools) ? manifest.tools : [];

  tools.forEach((tool, index) => {
    if (!tool || !Array.isArray(tool.expose)) {
      return;
    }

    // Extractors and bindings keyed by a tool/operation that is not exposed never run.
    const exposed = new Set(tool.expose);
    const keyed: Array<[string, unknown]> = [
      ['customExtractors', tool.customExtractors],
      ['runtimeParamBindings', tool.runtimeParamBindings],
    ];
    for (const [field, value] of keyed) {
      if (!value || Array.isArray(value) || typeof value !== 'object') {
        continue;
      }
      for (const key of Object.keys(value)) {
        if (!exposed.has(key)) {
          warnings.push(`tools.${index}.${field}.${key}: '${key}' is not listed in expose and will be ignored`);
        }
      }
    }
  });

  return warnings;
}

function convertAjvError(ajvError: any): SchemaError {
  return {
    instancePath: ajvError.instancePath || '',
    keyword: ajvError.keyword,
    message: ajvError.message || '',
    schemaPath: ajvError.schemaPath || '',
    params: ajvError.params || {},
  };
}

/**
 * Formats validation errors for console output, collapsing the noise produced by if/then/else branches.
 */
export function formatErrors(errors: SchemaError[]): string[] {
  const lines = errors
    .filter(e => e.keyword !== 'if')
    .map(e => {
      const field = e.instancePath.replace(/^\//, '').replace(/\//g, '.') || 'manifest';
      const extra = e.keyword === 'additionalProperties' && e.params?.additionalProperty
        ? ` ('${e.params.additionalProperty}')`
        : e.keyword === 'enum' && Array.isArray(e.params?.allowedValues)
          ? ` (${e.params.allowedValues.join(', ')})`
          : '';
      return `${field}: ${e.message}${extra}`;
    });
  return [...new Set(lines)];
}

export { manifestSchema };
