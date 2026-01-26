/// <reference types="node" />
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
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
    catch { }
    try {
        const importMeta = globalThis.import?.meta;
        if (importMeta?.url) {
            const fileUrl = importMeta.url;
            if (typeof fileUrl === 'string' && fileUrl.startsWith('file:')) {
                const __filename = fileURLToPath(fileUrl);
                return dirname(__filename);
            }
        }
    }
    catch { }
    if (typeof __dirname !== 'undefined') {
        return __dirname;
    }
    return resolve(process.cwd(), 'src', 'shared');
}
function getSchemaPath() {
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
const connectorManifestSchema = JSON.parse(readFileSync(join(schemaDir, 'connector-manifest.json'), 'utf8'));
const publisherSchema = JSON.parse(readFileSync(join(schemaDir, 'publisher-config.json'), 'utf8'));
const validateExtensionSchema = ajv.compile(extensionManifestSchema);
const validateConnectorSchema = ajv.compile(connectorManifestSchema);
const validatePublisherSchemaInternal = ajv.compile(publisherSchema);
export function validateExtensionManifest(manifest) {
    const schemaResult = validateExtensionManifestSchema(manifest);
    const businessRuleErrors = validateExtensionBusinessRules(manifest);
    return {
        isValid: schemaResult.isValid && businessRuleErrors.length === 0,
        errors: [...schemaResult.errors, ...businessRuleErrors]
    };
}
export function validateConnectorManifest(manifest) {
    const schemaResult = validateConnectorManifestSchema(manifest);
    const businessRuleErrors = validateExtensionBusinessRules(manifest);
    return {
        isValid: schemaResult.isValid && businessRuleErrors.length === 0,
        errors: [...schemaResult.errors, ...businessRuleErrors]
    };
}
export function validatePublisherConfig(config) {
    return validatePublisherSchema(config);
}
export function validateExtensionManifestSchema(manifest) {
    const isValid = validateExtensionSchema(manifest);
    return {
        isValid,
        errors: isValid ? [] : (validateExtensionSchema.errors || []).map(convertAjvError)
    };
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
function validateExtensionBusinessRules(manifest) {
    const errors = [];
    const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
    if (tools.length > 1) {
        const toolNames = tools.map((tool) => tool?.name).filter(Boolean);
        const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
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
    const automationScripts = Array.isArray(manifest.automationScripts)
        ? manifest.automationScripts
        : [];
    if (automationScripts.length > 1) {
        const scriptNames = automationScripts.map((script) => script?.name).filter(Boolean);
        const duplicateScripts = scriptNames.filter((name, index) => scriptNames.indexOf(name) !== index);
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
    const eventTriggers = Array.isArray(manifest.eventTriggers)
        ? manifest.eventTriggers
        : [];
    if (eventTriggers.length > 1) {
        const triggerNames = eventTriggers.map((trigger) => trigger?.name).filter(Boolean);
        const duplicateTriggers = triggerNames.filter((name, index) => triggerNames.indexOf(name) !== index);
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
        const scriptNames = new Set(automationScripts.map((script) => script?.name).filter(Boolean));
        eventTriggers.forEach((trigger) => {
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
    const schema = schemaType === 'extension-manifest'
        ? extensionManifestSchema
        : schemaType === 'connector-manifest'
            ? connectorManifestSchema
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
function extractFieldSchema(fieldPath, schema) {
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
        }
        else if (currentSchema.definitions && currentSchema.definitions[part]) {
            currentSchema = currentSchema.definitions[part];
        }
        else if (currentSchema[part]) {
            currentSchema = currentSchema[part];
        }
        else {
            return null;
        }
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
        regions: 'Regions'
    };
    return fieldNames[path] || path;
}
export { extensionManifestSchema, connectorManifestSchema, publisherSchema };
//# sourceMappingURL=schema-validator.js.map