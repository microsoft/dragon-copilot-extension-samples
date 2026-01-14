export interface PublisherConfig {
    publisherId: string;
    publisherName: string;
    websiteUrl: string;
    privacyPolicyUrl: string;
    supportUrl: string;
    version: string;
    contactEmail: string;
    offerId: string;
    defaultLocale: string;
    supportedLocales: string[];
    scope: string;
    regions: string[];
}
export type PromptValidator = (value: string) => string | boolean;
export interface PublisherPromptValidators {
    publisherId?: PromptValidator;
    publisherName?: PromptValidator;
    websiteUrl?: PromptValidator;
    privacyPolicyUrl?: PromptValidator;
    supportUrl?: PromptValidator;
    version?: PromptValidator;
    contactEmail?: PromptValidator;
    offerId?: PromptValidator;
}
export interface PublisherPromptOptions {
    defaults?: Partial<PublisherConfig>;
    validators?: PublisherPromptValidators;
    scope?: string;
    defaultLocale?: string;
    supportedLocales?: string[];
    regions?: string[];
    offerIdGenerator?: (publisherId: string) => string | undefined;
}
export declare function promptPublisherDetails(options?: PublisherPromptOptions): Promise<PublisherConfig>;
//# sourceMappingURL=publisher.d.ts.map