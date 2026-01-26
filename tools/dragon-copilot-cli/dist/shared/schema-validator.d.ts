import type { DragonExtensionManifest, PublisherConfig } from '../domains/extension/types.js';
import type { ConnectorIntegrationManifest } from '../domains/connector/types.js';
declare const extensionManifestSchema: any;
declare const connectorManifestSchema: any;
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
export declare function validateConnectorManifest(manifest: ConnectorIntegrationManifest): ValidationResult;
export declare function validatePublisherConfig(config: PublisherConfig): ValidationResult;
export declare function validateExtensionManifestSchema(manifest: DragonExtensionManifest): ValidationResult;
export declare function validateConnectorManifestSchema(manifest: ConnectorIntegrationManifest): ValidationResult;
export declare function validatePublisherSchema(config: PublisherConfig): ValidationResult;
export declare function validateFieldValue(value: unknown, fieldPath: string, schemaType: 'extension-manifest' | 'connector-manifest' | 'publisher'): string | true;
export declare function getFieldDisplayName(path: string): string;
export { extensionManifestSchema, connectorManifestSchema, publisherSchema };
//# sourceMappingURL=schema-validator.d.ts.map