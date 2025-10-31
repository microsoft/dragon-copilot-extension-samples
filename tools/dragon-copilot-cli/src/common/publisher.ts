import { input } from '@inquirer/prompts';

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

const withDefault = (value: string | undefined): Record<string, string> =>
  value !== undefined ? { default: value } : {};

const requiredField: PromptValidator = value => (value.trim() ? true : 'This field is required');

const emailValidator: PromptValidator = value => {
  if (!value.trim()) {
    return 'This field is required';
  }

  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value) ? true : 'Please enter a valid email address';
};

const urlValidator: PromptValidator = value => {
  if (!value.trim()) {
    return 'This field is required';
  }

  try {
    new URL(value);
    return true;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
};

const versionValidator: PromptValidator = value => {
  if (!value.trim()) {
    return 'Version is required';
  }

  return /^\d+\.\d+\.\d+$/.test(value) ? true : 'Version must be in format x.y.z (e.g., 1.0.0)';
};

export async function promptPublisherDetails(options?: PublisherPromptOptions): Promise<PublisherConfig> {
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
  } satisfies Required<PublisherPromptValidators>;

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

  const offerIdDefault =
    defaults.offerId ?? options?.offerIdGenerator?.(publisherId) ?? `${publisherId.split('.')[0]}-suite`;

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
