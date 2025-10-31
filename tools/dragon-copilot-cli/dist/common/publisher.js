import { input } from '@inquirer/prompts';
const withDefault = (value) => value !== undefined ? { default: value } : {};
const requiredField = value => (value.trim() ? true : 'This field is required');
const emailValidator = value => {
    if (!value.trim()) {
        return 'This field is required';
    }
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) ? true : 'Please enter a valid email address';
};
const urlValidator = value => {
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
const versionValidator = value => {
    if (!value.trim()) {
        return 'Version is required';
    }
    return /^\d+\.\d+\.\d+$/.test(value) ? true : 'Version must be in format x.y.z (e.g., 1.0.0)';
};
export async function promptPublisherDetails(options) {
    const defaults = options?.defaults ?? {};
    const validators = {
        publisherId: options?.validators?.publisherId ?? requiredField,
        publisherName: options?.validators?.publisherName ?? requiredField,
        websiteUrl: options?.validators?.websiteUrl ?? urlValidator,
        privacyPolicyUrl: options?.validators?.privacyPolicyUrl ?? urlValidator,
        supportUrl: options?.validators?.supportUrl ?? urlValidator,
        version: options?.validators?.version ?? versionValidator,
        contactEmail: options?.validators?.contactEmail ?? emailValidator,
        offerId: options?.validators?.offerId ?? requiredField
    };
    const publisherId = await input({
        message: 'Publisher ID (e.g., contoso.healthcare):',
        ...withDefault(defaults.publisherId),
        validate: validators.publisherId
    });
    const publisherName = await input({
        message: 'Publisher Name:',
        ...withDefault(defaults.publisherName),
        validate: validators.publisherName
    });
    const websiteUrl = await input({
        message: 'Website URL:',
        ...withDefault(defaults.websiteUrl),
        validate: validators.websiteUrl
    });
    const privacyPolicyUrl = await input({
        message: 'Privacy Policy URL:',
        ...withDefault(defaults.privacyPolicyUrl),
        validate: validators.privacyPolicyUrl
    });
    const supportUrl = await input({
        message: 'Support URL:',
        ...withDefault(defaults.supportUrl),
        validate: validators.supportUrl
    });
    const version = await input({
        message: 'Publisher Config Version:',
        default: defaults.version ?? '0.0.1',
        validate: validators.version
    });
    const contactEmail = await input({
        message: 'Contact Email:',
        ...withDefault(defaults.contactEmail),
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