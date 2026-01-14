import type { DragonExtensionManifest, PublisherConfig } from '../domains/extension/types.js';
import type { PartnerIntegrationManifest } from '../domains/partner/types.js';
declare const extensionManifestSchema: any;
declare const partnerManifestSchema: any;
declare const publisherSchema: any;
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
export declare function validateExtensionManifest(manifest: DragonExtensionManifest): ValidationResult;
export declare function validatePartnerManifest(manifest: PartnerIntegrationManifest): ValidationResult;
export declare function validatePublisherConfig(config: PublisherConfig): ValidationResult;
export declare function validateExtensionManifestSchema(manifest: DragonExtensionManifest): ValidationResult;
export declare function validatePartnerManifestSchema(manifest: PartnerIntegrationManifest): ValidationResult;
export declare function validatePublisherSchema(config: PublisherConfig): ValidationResult;
export declare function validateFieldValue(value: unknown, fieldPath: string, schemaType: 'extension-manifest' | 'partner-manifest' | 'publisher'): string | true;
export declare function getFieldDisplayName(path: string): string;
export { extensionManifestSchema, partnerManifestSchema, publisherSchema };
//# sourceMappingURL=schema-validator.d.ts.map