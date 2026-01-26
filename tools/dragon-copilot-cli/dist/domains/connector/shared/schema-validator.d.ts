import type { ConnectorIntegrationManifest, PublisherConfig } from '../types.js';
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
export declare function validateConnectorManifest(manifest: ConnectorIntegrationManifest): ValidationResult;
export declare function validatePublisherConfig(config: PublisherConfig): ValidationResult;
export declare function validateConnectorManifestSchema(manifest: ConnectorIntegrationManifest): ValidationResult;
export declare function validatePublisherSchema(config: PublisherConfig): ValidationResult;
export declare function validateFieldValue(value: unknown, fieldPath: string, schemaType: 'manifest' | 'publisher'): string | true;
export declare function getFieldDisplayName(path: string): string;
export { connectorManifestSchema, publisherSchema };
//# sourceMappingURL=schema-validator.d.ts.map