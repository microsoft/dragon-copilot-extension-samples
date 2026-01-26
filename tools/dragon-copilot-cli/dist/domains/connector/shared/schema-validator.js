import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
function getCurrentModuleDir() {
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
    }
    catch {
        // ignore stack parsing issues and continue to other strategies
    }
    if (typeof __dirname !== 'undefined') {
        return __dirname;
    }
    return resolve(process.cwd(), 'src', 'shared');
}
function getSchemaPath() {
    const currentDir = getCurrentModuleDir();
    const candidates = [
        resolve(currentDir, '..', 'schemas'),
        resolve(currentDir, '..', '..', 'schemas'),
        resolve(process.cwd(), 'src', 'schemas'),
        resolve(process.cwd(), 'dist', 'schemas'),
    ];
    for (const candidate of candidates) {
        if (existsSync(join(candidate, 'connector-manifest.json'))) {
            return candidate;
        }
    }
    return resolve(currentDir, '..', 'schemas');
}
const schemaDir = getSchemaPath();
const connectorManifestSchema = JSON.parse(readFileSync(join(schemaDir, 'connector-manifest.json'), 'utf8'));
const publisherSchema = JSON.parse(readFileSync(join(schemaDir, 'publisher-config.json'), 'utf8'));
const validateConnectorSchema = ajv.compile(connectorManifestSchema);
const validatePublisherSchemaInternal = ajv.compile(publisherSchema);
export function validateConnectorManifest(manifest) {
    const schemaResult = validateConnectorManifestSchema(manifest);
    const businessRuleErrors = validateManifestBusinessRules(manifest);
    return {
        isValid: schemaResult.isValid && businessRuleErrors.length === 0,
        errors: [...schemaResult.errors, ...businessRuleErrors]
    };
}
export function validatePublisherConfig(config) {
    return validatePublisherSchema(config);
}
export function validateConnectorManifestSchema(manifest) {
    const isValid = validateConnectorSchema(manifest);
    return {
        isValid,
        errors: isValid ? [] : (validateConnectorSchema.errors || []).map(convertAjvError)
    };
}
export function validatePublisherSchema(config) {
    const isValid = validatePublisherSchemaInternal(config);
    return {
        isValid,
        errors: isValid ? [] : (validatePublisherSchemaInternal.errors || []).map(convertAjvError)
    };
}
function validateManifestBusinessRules(manifest) {
    const errors = [];
    return errors;
}
function convertAjvError(ajvError) {
    return {
        instancePath: ajvError.instancePath || '',
        keyword: ajvError.keyword || 'unknown',
        message: ajvError.message || '',
        data: ajvError.data,
        schemaPath: ajvError.schemaPath || '',
        params: ajvError.params
    };
}
export function validateFieldValue(value, fieldPath, schemaType) {
    const schema = schemaType === 'manifest' ? connectorManifestSchema : publisherSchema;
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
function extractFieldSchema(fieldPath, schema) {
    const pathParts = fieldPath.split('.');
    let currentSchema = schema;
    for (const part of pathParts) {
        if (currentSchema && typeof currentSchema === 'object') {
            if (currentSchema.properties && currentSchema.properties[part]) {
                currentSchema = currentSchema.properties[part];
                continue;
            }
            if (currentSchema.definitions && currentSchema.definitions[part]) {
                currentSchema = currentSchema.definitions[part];
                continue;
            }
            if (part === 'properties' && currentSchema.properties) {
                currentSchema = currentSchema.properties;
                continue;
            }
            if (part === 'definitions' && currentSchema.definitions) {
                currentSchema = currentSchema.definitions;
                continue;
            }
            if (currentSchema[part] !== undefined) {
                currentSchema = currentSchema[part];
                continue;
            }
        }
        return null;
    }
    return currentSchema;
}
export function getFieldDisplayName(path) {
    const fieldNames = {
        publisherId: 'Publisher ID',
        publisherName: 'Publisher Name',
        websiteUrl: 'Website URL',
        privacyPolicyUrl: 'Privacy Policy URL',
        supportUrl: 'Support URL',
        contactEmail: 'Contact Email',
        offerId: 'Offer ID',
        defaultLocale: 'Default Locale',
        supportedLocales: 'Supported Locales',
        regions: 'Regions',
        scope: 'Scope'
    };
    return fieldNames[path] || path;
}
export { connectorManifestSchema, publisherSchema };
//# sourceMappingURL=schema-validator.js.map