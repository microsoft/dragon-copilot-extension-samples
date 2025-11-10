import type { DragonExtensionManifest, PublisherConfig } from '../types.js';
declare const manifestSchema: any;
declare const publisherSchema: any;
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
export declare function validateExtensionManifest(manifest: DragonExtensionManifest): ValidationResult;
/**
 * Complete validation for Publisher Configuration
 * Pure JSON Schema validation (no additional business rules needed)
 */
export declare function validatePublisherConfig(config: PublisherConfig): ValidationResult;
/**
 * Pure JSON Schema validation for Extension Manifest
 */
export declare function validateManifestSchema(manifest: DragonExtensionManifest): ValidationResult;
/**
 * Pure JSON Schema validation for Publisher Configuration
 */
export declare function validatePublisherSchema(config: PublisherConfig): ValidationResult;
/**
 * Field validation for prompts
 */
export declare function validateFieldValue(value: any, fieldPath: string, schemaType: 'manifest' | 'publisher'): string | true;
/**
 * Helper function to get user-friendly field names
 */
export declare function getFieldDisplayName(path: string): string;
export { manifestSchema, publisherSchema };
//# sourceMappingURL=schema-validator.d.ts.map