import { input } from '@inquirer/prompts';
const defaultNonEmptyValidator = value => {
    return value.trim() ? true : 'This field is required';
};
const defaultEmailValidator = value => {
    if (!value.trim()) {
        return 'This field is required';
    }
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) ? true : 'Please enter a valid email address';
};
const defaultUrlValidator = value => {
    if (!value.trim()) {
        return 'This field is required';
    }
    try {
        new URL(value);
        return true;
    }
    catch {
        return 'Please enter a valid URL (e.g., https://example.com)';
    }
};
const defaultVersionValidator = value => {
    if (!value.trim()) {
        return 'Version is required';
    }
    return /^\d+\.\d+\.\d+$/.test(value)
        ? true
        : 'Version must be in format x.y.z (e.g., 1.0.0)';
};
export async function promptPublisherDetails(options) {
    const defaults = options?.defaults ?? {};
    const validators = {
        publisherId: options?.validators?.publisherId ?? defaultNonEmptyValidator,
        publisherName: options?.validators?.publisherName ?? defaultNonEmptyValidator,
        websiteUrl: options?.validators?.websiteUrl ?? defaultUrlValidator,
        privacyPolicyUrl: options?.validators?.privacyPolicyUrl ?? defaultUrlValidator,
        supportUrl: options?.validators?.supportUrl ?? defaultUrlValidator,
        version: options?.validators?.version ?? defaultVersionValidator,
        contactEmail: options?.validators?.contactEmail ?? defaultEmailValidator,
        offerId: options?.validators?.offerId ?? defaultNonEmptyValidator
    };
    const publisherId = await input({
        message: 'Publisher ID (e.g., contoso.healthcare):',
        default: defaults.publisherId,
        validate: validators.publisherId
    });
    const publisherName = await input({
        message: 'Publisher Name:',
        default: defaults.publisherName,
        validate: validators.publisherName
    });
    const websiteUrl = await input({
        message: 'Website URL:',
        default: defaults.websiteUrl,
        validate: validators.websiteUrl
    });
    const privacyPolicyUrl = await input({
        message: 'Privacy Policy URL:',
        default: defaults.privacyPolicyUrl,
        validate: validators.privacyPolicyUrl
    });
    const supportUrl = await input({
        message: 'Support URL:',
        default: defaults.supportUrl,
        validate: validators.supportUrl
    });
    const version = await input({
        message: 'Publisher Config Version:',
        default: defaults.version ?? '0.0.1',
        validate: validators.version
    });
    const contactEmail = await input({
        message: 'Contact Email:',
        default: defaults.contactEmail,
        validate: validators.contactEmail
    });
    const offerIdDefault = defaults.offerId ?? options?.offerIdGenerator?.(publisherId) ?? `${publisherId.split('.')[0]}-suite`;
    const offerId = await input({
        message: 'Offer ID:',
        default: offerIdDefault,
        validate: validators.offerId
    });
    return {
        publisherId,
        publisherName,
        websiteUrl,
        privacyPolicyUrl,
        supportUrl,
        version,
        contactEmail,
        offerId,
        defaultLocale: options?.defaultLocale ?? defaults.defaultLocale ?? 'en-US',
        supportedLocales: options?.supportedLocales ?? defaults.supportedLocales ?? ['en-US'],
        scope: options?.scope ?? defaults.scope ?? 'Workflow',
        regions: options?.regions ?? defaults.regions ?? ['US']
    };
}
//# sourceMappingURL=publisher.js.map