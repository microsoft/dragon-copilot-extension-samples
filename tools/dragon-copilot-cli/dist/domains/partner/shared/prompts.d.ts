import type { AuthConfig, IntegrationDetails, PartnerIntegrationManifest, PublisherConfig } from '../types.js';
export declare function validateIntegrationName(input: string): string | boolean;
export declare function validateVersion(input: string): string | boolean;
export declare function validateUrl(input: string): string | boolean;
export declare function validateEmail(input: string): string | boolean;
export declare function validatePublisherId(input: string): string | boolean;
export declare function validatePartnerId(input: string): string | boolean;
export declare function validateGuid(input: string): string | boolean;
export declare function validateTenantId(input: string): string | boolean;
export declare function validateIdentityClaim(input: string): string | boolean;
export declare function promptIntegrationDetails(defaults?: Partial<IntegrationDetails>): Promise<IntegrationDetails>;
export declare function promptAuthDetails(): Promise<AuthConfig>;
export declare function promptPublisherDetails(): Promise<PublisherConfig>;
export declare function runPartnerManifestWizard(defaults?: Partial<IntegrationDetails>): Promise<PartnerIntegrationManifest>;
//# sourceMappingURL=prompts.d.ts.map