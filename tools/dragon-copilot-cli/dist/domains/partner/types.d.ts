import type { PublisherConfig as CommonPublisherConfig } from '../../common/index.js';
export type YesNo = 'yes' | 'no';
export interface AuthConfig {
    tenantId: string;
}
export type NoteSectionValue = string | string[] | null;
export interface PartnerIntegrationManifest {
    name: string;
    description: string;
    version: string;
    ['partner-id']: string;
    ['clinical-application-name']: string;
    ['server-authentication']: ServerAuthenticationEntry[];
    ['note-sections']?: Record<string, NoteSectionValue>;
    instance: InstanceConfig;
}
export interface ServerAuthenticationEntry {
    issuer: string;
    identity_claim: string;
    identity_value: string[];
}
export interface InstanceConfig {
    ['client-authentication']: ClientAuthenticationConfig;
    ['web-launch-sof']?: NamedFieldConfig;
    ['web-launch-token']?: WebLaunchTokenConfig;
    ['context-retrieval']?: ContextRetrievalConfig;
}
export interface ClientAuthenticationConfig {
    ['allow-multiple-issuers']?: YesNo;
    issuer: ClientAuthenticationIssuerFields;
}
export interface ManifestFieldConfig {
    type: string;
    description: string;
    ['default-value']?: string;
    required: YesNo;
}
export interface NamedFieldConfig extends ManifestFieldConfig {
    name?: string;
}
export interface ClientAuthenticationIssuerFields {
    ['access-token-issuer']: ManifestFieldConfig;
    ['user-identity-claim']?: ManifestFieldConfig;
    ['customer-identity-claim']?: ManifestFieldConfig;
}
export interface WebLaunchTokenConfig {
    ['use-client-authentication']?: YesNo;
    ['allow-multiple-issuers']?: YesNo;
    issuer?: NamedFieldConfig[];
}
export interface ContextRetrievalConfig {
    instance: ContextRetrievalItem[];
}
export interface ContextRetrievalItem {
    name: string;
    type: string;
    description: string;
    required: YesNo;
    ['default-value']?: string;
}
export type PublisherConfig = CommonPublisherConfig;
export interface GenerateOptions {
    template?: string;
    output?: string;
    interactive?: boolean;
}
export interface InitOptions {
    name?: string;
    description?: string;
    version?: string;
    output?: string;
}
export interface PackageOptions {
    manifest?: string;
    output?: string;
    include?: string[];
    silent?: boolean;
}
export interface TemplateConfig {
    manifest: PartnerIntegrationManifest;
    description: string;
}
export interface IntegrationDetails {
    name: string;
    description: string;
    version: string;
    partnerId: string;
    clinicalApplicationName: string;
    rawName?: string;
}
//# sourceMappingURL=types.d.ts.map