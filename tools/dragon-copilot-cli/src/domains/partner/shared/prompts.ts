import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { promptPublisherDetails as promptCommonPublisherDetails } from '../../../common/index.js';
import { randomUUID } from 'node:crypto';
import type {
  AuthConfig,
  ContextRetrievalItem,
  IntegrationDetails,
  InstanceConfig,
  ManifestFieldConfig,
  NamedFieldConfig,
  NoteSectionValue,
  PartnerIntegrationManifest,
  PublisherConfig,
  ServerAuthenticationEntry,
  YesNo
} from '../types.js';
import {
  EMPTY_NOTE_PLACEHOLDER,
  NOTE_SECTION_LABELS,
  NOTE_SECTION_ORDER
} from './note-sections.js';
import type { NoteSectionKey } from './note-sections.js';
import { buildIntegrationDescription } from './integration-description.js';
import { CONTEXT_ITEM_CATALOG } from './context-items.js';

const WEB_LAUNCH_FIELD_TYPE_CHOICES = [
  { name: 'URL', value: 'url' },
  { name: 'String', value: 'string' }
] as const;

const sanitizeListInput = (value: string): string[] =>
  value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

const normalizeIntegrationName = (value: string): string => {
  if (!value) {
    return '';
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, ' ');

  return normalized;
};

const logSectionHeading = (icon: string, title: string): void => {
  console.log(`\n${icon} ${title}`);
};

const logInfo = (message: string): void => {
  console.log(`ℹ️  ${message}`);
};

const buildManifestField = (
  type: string,
  description: string,
  required: YesNo,
  defaultValue?: string
): ManifestFieldConfig => {
  const field: ManifestFieldConfig = {
    type,
    description,
    required
  };

  if (defaultValue && defaultValue.trim()) {
    field['default-value'] = defaultValue.trim();
  }

  return field;
};

const yesNo = async (message: string, defaultValue: YesNo = 'no'): Promise<YesNo> => {
  const response = await confirm({ message, default: defaultValue === 'yes' });
  return response ? 'yes' : 'no';
};

const collectWithReview = async <T>(
  sectionName: string,
  gather: () => Promise<T>,
  summarize: (value: T) => string[]
): Promise<T> => {
  while (true) {
    const value = await gather();
    const summary = summarize(value);

    if (summary.length) {
      console.log(`\n${sectionName} review:`);
      summary.forEach(line => console.log(`  • ${line}`));
    }

    const keep = await confirm({ message: `Keep these ${sectionName.toLowerCase()}?`, default: true });
    if (keep) {
      return value;
    }

    console.log('↺ Let’s try that section again.\n');
  }
};

export function validateIntegrationName(input: string): string | boolean {
  const trimmed = input.trim();
  if (!trimmed) return 'Integration name is required';
  if (trimmed.length < 3) return 'Integration name must be at least 3 characters long';
  if (trimmed.length > 50) return 'Integration name must be less than 50 characters';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\s\-_.]*[a-zA-Z0-9]$/.test(trimmed)) {
    return 'Integration name must start and end with alphanumeric characters and can contain spaces, hyphens, underscores, and periods';
  }

  if (!normalizeIntegrationName(trimmed)) {
    return 'Integration name must include at least one letter or number';
  }

  return true;
}

export function validateVersion(input: string): string | boolean {
  if (!input.trim()) return 'Version is required';
  if (!/^\d+\.\d+\.\d+$/.test(input)) return 'Version must be in format x.y.z (e.g., 1.0.0)';
  return true;
}

export function validateUrl(input: string): string | boolean {
  if (!input.trim()) return 'URL is required';
  try {
    new URL(input);
    return true;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
}

export function validateEmail(input: string): string | boolean {
  if (!input.trim()) return 'Email is required';
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(input) ? true : 'Please enter a valid email address';
}

export function validatePublisherId(input: string): string | boolean {
  if (!input.trim()) return 'Publisher ID is required';
  if (!/^[a-z0-9][a-z0-9\-.]*[a-z0-9]$/.test(input)) {
    return 'Publisher ID must be lowercase, start and end with alphanumeric characters, and can contain dots and hyphens';
  }
  return true;
}

export function validatePartnerId(input: string): string | boolean {
  if (!input.trim()) return 'Partner ID is required';
  if (input !== input.toLowerCase()) return 'Partner ID must be lowercase';
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(input)) {
    return 'Partner ID must start and end with alphanumeric characters and can include hyphens, dots, or underscores';
  }
  return true;
}

export function validateGuid(input: string): string | boolean {
  if (!input.trim()) return 'Value is required';
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(input.trim()) ? true : 'Value must be a valid GUID format (e.g., 12345678-1234-1234-1234-123456789abc)';
}

export function validateTenantId(input: string): string | boolean {
  return validateGuid(input);
}

export function validateIdentityClaim(input: string): string | boolean {
  if (!input.trim()) return 'Identity claim is required';
  return /^[A-Za-z]{3}$/.test(input.trim()) ? true : 'Identity claim must be exactly 3 letters';
}

const validateRequiredText = (fieldName: string) => (input: string): string | boolean => {
  if (!input || !input.trim()) {
    return `${fieldName} is required`;
  }
  return true;
};

const gatherIntegrationDetails = async (
  defaults?: Partial<IntegrationDetails>
): Promise<IntegrationDetails> => {
  const nameDefault = defaults?.rawName || defaults?.name;
  const namePromptBase = {
    message: 'Integration name:',
    validate: validateIntegrationName
  };

  const name = await input(
    nameDefault && nameDefault.trim()
      ? { ...namePromptBase, default: nameDefault }
      : namePromptBase
  );

  const version = await input({
    message: 'Integration version:',
    default: defaults?.version || '0.0.1',
    validate: validateVersion
  });

  logInfo('Partner ID should match the identifier from your app source (e.g., Microsoft Partner Center).');
  logInfo('If you have not received a Partner ID yet, you can generate a GUID now and use it in the manifest.');

  let partnerId: string;
  const hasExternalId = await yesNo(
    'Do you already have a Partner ID from NMC or Partner Center?',
    defaults?.partnerId ? 'yes' : 'no'
  );

  if (hasExternalId === 'yes') {
    partnerId = await input({
      message: 'Partner ID (App Source Id):',
      ...(defaults?.partnerId ? { default: defaults.partnerId } : {}),
      validate: validatePartnerId
    });
  } else {
    partnerId = randomUUID().toLowerCase();
    logInfo(`Generated Partner ID GUID: ${partnerId}`);
  }

  const trimmedName = name.trim();
  const normalizedName = normalizeIntegrationName(trimmedName);
  if (!normalizedName) {
    throw new Error('Integration name normalization failed. Please enter a name with at least one letter or number.');
  }
  const description = buildIntegrationDescription(trimmedName || normalizedName);
  logInfo(`Integration description set to "${description}".`);

  console.log('');
  logInfo('Clinical application name typically matches the embedded EHR or workflow integration that supplies user identity context to Dragon Copilot.');
  const clinicalApplicationName = await input({
    message: 'Clinical application name:',
    default: defaults?.clinicalApplicationName || 'Sample Partner Clinical Application',
    validate: validateRequiredText('Clinical application name')
  });

  return {
    name: normalizedName,
    rawName: trimmedName,
    description,
    version,
    partnerId,
    clinicalApplicationName
  };
};

const summarizeIntegrationDetails = (details: IntegrationDetails): string[] => {
  const trimmedRaw = details.rawName?.trim();
  const summary: string[] = [`Manifest name: ${details.name}`];

  if (trimmedRaw && trimmedRaw !== details.name) {
    summary.push(`Entered name: ${trimmedRaw}`);
  }

  summary.push(
    `Description: ${details.description}`,
    `Version: ${details.version}`,
    `Partner ID: ${details.partnerId}`,
    `Clinical application: ${details.clinicalApplicationName}`
  );

  return summary;
};

export async function promptIntegrationDetails(
  defaults?: Partial<IntegrationDetails>
): Promise<IntegrationDetails> {
  return collectWithReview('Integration details', () => gatherIntegrationDetails(defaults), summarizeIntegrationDetails);
}

export async function promptAuthDetails(): Promise<AuthConfig> {
  const tenantId = await input({
    message: 'Azure Tenant ID (GUID):',
    validate: validateTenantId
  });

  return { tenantId };
}

const gatherPublisherDetails = async (): Promise<PublisherConfig> =>
  promptCommonPublisherDetails({
    defaults: {
      version: '0.0.1',
      defaultLocale: 'en-US',
      supportedLocales: ['en-US'],
      regions: ['US'],
      scope: 'EHR Connector'
    },
    validators: {
      publisherId: validatePublisherId,
      publisherName: (value: string) => (value.trim() ? true : 'Publisher name is required'),
      websiteUrl: validateUrl,
      privacyPolicyUrl: validateUrl,
      supportUrl: validateUrl,
      version: validateVersion,
      contactEmail: validateEmail,
      offerId: (value: string) => (value.trim() ? true : 'Offer ID is required')
    },
    scope: 'EHR Connector',
    defaultLocale: 'en-US',
    supportedLocales: ['en-US'],
    regions: ['US'],
    offerIdGenerator: (publisherId: string) => `${publisherId.split('.')[0]}-integration-suite`
  });

const summarizePublisherDetails = (config: PublisherConfig): string[] => [
  `Publisher ID: ${config.publisherId}`,
  `Name: ${config.publisherName}`,
  `Website: ${config.websiteUrl}`,
  `Privacy Policy: ${config.privacyPolicyUrl}`,
  `Support: ${config.supportUrl}`,
  `Version: ${config.version}`,
  `Contact Email: ${config.contactEmail}`,
  `Offer ID: ${config.offerId}`
];

export async function promptPublisherDetails(): Promise<PublisherConfig> {
  return collectWithReview('Publisher configuration', gatherPublisherDetails, summarizePublisherDetails);
}

const gatherServerAuthenticationEntry = async (
  index: number
): Promise<ServerAuthenticationEntry> => {
  const issuer = await input({
    message: `Server authentication issuer ${index + 1}:`,
    validate: validateUrl
  });
  console.log('');
logInfo(
    'Common Entra ID claims include the Enterprise Application Object ID (oid) or the Application (Client) ID (azp) values.');
  logInfo(
    'Find your service principal and tenant IDs: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/assign-roles-azure-service-principals#find-your-service-principal-and-tenant-ids'
  );
  console.log('');

  const identity_claim = await input({
    message: `Identity claim ${index + 1}:`,
    default: 'azp',
    validate: validateIdentityClaim
  });

  const identityValueRaw = await input({
    message: `Allowed identity values ${index + 1} (comma separated):`,
    validate: (value: string) => (sanitizeListInput(value).length ? true : 'At least one identity value is required')
  });

  return {
    issuer,
    identity_claim,
    identity_value: sanitizeListInput(identityValueRaw)
  };
};

const gatherServerAuthenticationEntries = async (): Promise<ServerAuthenticationEntry[]> => {
  const entries: ServerAuthenticationEntry[] = [];
  let addMore = true;

  while (addMore) {
    entries.push(await gatherServerAuthenticationEntry(entries.length));
    addMore = await confirm({ message: 'Add another server authentication issuer?', default: false });
  }

  return entries;
};

const summarizeServerAuthentication = (entries: ServerAuthenticationEntry[]): string[] => {
  if (!entries.length) {
    return ['No server authentication issuers configured'];
  }

  return entries.map((entry, index) => {
    const identities = entry.identity_value.join(', ');
    return `Issuer ${index + 1}: ${entry.issuer} (${entry.identity_claim} → ${identities})`;
  });
};

const describeNoteSectionValue = (value: string | string[] | null): string => {
  const formatSection = (key: string): string => {
    const label = NOTE_SECTION_LABELS[key as NoteSectionKey] ?? (key === 'plan' ? 'Plan' : undefined);
    return label ? `${label} (${key})` : key;
  };

  if (Array.isArray(value)) {
    return value.length ? value.map(formatSection).join(', ') : '(not configured)';
  }
  if (value === null || value === undefined) {
    return '(not configured)';
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === EMPTY_NOTE_PLACEHOLDER) return '(not configured)';
  return formatSection(trimmed);
};

const gatherNoteSections = async (): Promise<Record<string, string | string[] | null>> => {
  logInfo('Each note section can be generated individually or mapped to another section. Select each individually generated section and the mapped sections to it below.');
  console.log('');

  const PLAN_KEY = 'plan';
  const sections: Record<string, string | string[] | null> = {};
  const mappedToOther = new Set<string>();
  const usedSections = new Set<string>();
  let planMapped = false;

  const getSectionLabel = (key: string): string => {
    if (key === PLAN_KEY) {
      return 'Plan';
    }
    const label = NOTE_SECTION_LABELS[key as NoteSectionKey];
    return label ?? key;
  };

  const buildAvailable = (currentKey: string): string[] => {
    const base: string[] = NOTE_SECTION_ORDER.filter(
      option => option !== currentKey && !usedSections.has(option) && !mappedToOther.has(option)
    );

    if (!planMapped && currentKey !== PLAN_KEY && !usedSections.has(PLAN_KEY) && !mappedToOther.has(PLAN_KEY)) {
      base.push(PLAN_KEY);
    }

    return base;
  };

  for (const key of NOTE_SECTION_ORDER) {
    if (mappedToOther.has(key)) {
      sections[key] = EMPTY_NOTE_PLACEHOLDER;
      continue;
    }

    const generate = await confirm({
      message: `Generate ${key}?`,
      default: true
    });

    if (!generate) {
      sections[key] = EMPTY_NOTE_PLACEHOLDER;
      continue;
    }

    const assigned: string[] = [key];
    usedSections.add(key);

    if (key === 'assessment') {
      const mapPlanToAssessment = await confirm({
        message: 'Map plan to assessment?',
        default: true
      });

      if (mapPlanToAssessment) {
        assigned.push(PLAN_KEY);
        planMapped = true;
        usedSections.add(PLAN_KEY);
        mappedToOther.add(PLAN_KEY);
      }
    }

    const available = buildAvailable(key);

    if (available.length) {
      const selections = await checkbox<string>({
        message: `Select sections to map to ${key} (press Space to toggle, Enter to continue):`,
        choices: available.map(option => ({
          name: `${getSectionLabel(option)} (${option})`,
          value: option
        })),
        loop: false
      });

      for (const selection of selections) {
        assigned.push(selection);
        if (selection === PLAN_KEY) {
          planMapped = true;
        }
        mappedToOther.add(selection);
        usedSections.add(selection);
      }
    }

    let value: NoteSectionValue;
    if (assigned.length === 0) {
      value = EMPTY_NOTE_PLACEHOLDER;
    } else if (assigned.length === 1) {
      value = assigned[0] ?? EMPTY_NOTE_PLACEHOLDER;
    } else {
      value = assigned as string[];
    }

    sections[key] = value;
  }

  return sections;
};

const summarizeNoteSections = (
  sections: Record<string, string | string[] | null>
): string[] =>
  NOTE_SECTION_ORDER.map(key => {
    const value = sections[key] ?? null;
    return `${NOTE_SECTION_LABELS[key]}: ${describeNoteSectionValue(value)}`;
  });

const gatherNamedIssuerFields = async (): Promise<NamedFieldConfig[]> => {
  const fields: NamedFieldConfig[] = [];
  let addMore = true;

  while (addMore) {
    const index = fields.length + 1;
    const name = await input({
      message: `Web launch issuer field ${index} name:`,
      ...(index === 1 ? { default: 'access-token-issuer' } : {}),
      validate: (value: string) => (value.trim() ? true : 'Field name is required')
    });

    const type = await select<string>({
      message: `Web launch issuer field ${index} type:`,
      choices: WEB_LAUNCH_FIELD_TYPE_CHOICES,
      default: 'url'
    });

    const description = await input({
      message: `Web launch issuer field ${index} description:`,
      ...(index === 1 ? { default: 'Issuer claim for partner-issued web launch tokens.' } : {}),
      validate: (value: string) => (value.trim() ? true : 'Description is required')
    });

    const required = await yesNo('Is this field required?', index === 1 ? 'yes' : 'no');

    const defaultValue = await input({
      message: `Default value for ${name} (optional):`,
      validate: (value: string) => {
        if (!value.trim()) return true;
        return type === 'url' ? validateUrl(value.trim()) : true;
      }
    });

    fields.push({
      name,
      ...buildManifestField(type, description, required, defaultValue)
    });

    addMore = await confirm({ message: 'Add another web launch issuer field?', default: false });
  }

  return fields;
};

const gatherContextRetrievalItems = async (): Promise<ContextRetrievalItem[] | null> => {
  logSectionHeading('🧠', 'Context Retrieval');
  logInfo('Select context values that the customer can provide. Leave empty when none are required.');
  logInfo('Interop environment values such as environment name, environment id, EHR type, product name, and partner id are collected automatically.');
  logInfo('Names, types, and descriptions are fixed. You can only change whether each item is required.');
  console.log('');

  const includeInterop = await confirm({
    message: 'Include Interop context values?',
    default: false
  });

  if (!includeInterop) {
    return null;
  }

  const items: ContextRetrievalItem[] = [];

  for (const catalogItem of CONTEXT_ITEM_CATALOG) {
    const includeItem = await confirm({
      message: `Include ${catalogItem.name}?`,
      default: catalogItem.defaultInclude
    });

    if (!includeItem) {
      continue;
    }

    const required = await yesNo(
      `Is ${catalogItem.name} required?`,
      catalogItem.defaultRequired
    );

    items.push({
      name: catalogItem.name,
      type: catalogItem.type,
      description: catalogItem.description,
      required
    });
  }

  return items.length ? items : null;
};

const gatherClientAuthAndWeb = async (): Promise<{
  clientAuth: InstanceConfig['client-authentication'];
  webLaunchSof?: NamedFieldConfig;
  webLaunchToken?: InstanceConfig['web-launch-token'];
}> => {
  console.log('');
  console.log('🔑 Client Authentication');
  logInfo('This section is for adding a partner manifest instance to a client environment.');
  logInfo('Indicate which items must be collected by the client admin. Items not required by the partner are omitted from the manifest.');
  console.log(''); 

  const allowMultipleIssuers = await yesNo('Allow multiple issuers for client authentication?', 'no');
  const accessTokenIssuerInput = await input({
    message: 'Default client authentication access token issuer URL (leave blank for none):',
    validate: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return true;
      }
      return validateUrl(trimmed);
    }
  });
  const accessTokenIssuer = accessTokenIssuerInput.trim();

  

  const clientAuth: InstanceConfig['client-authentication'] = {
    'allow-multiple-issuers': allowMultipleIssuers,
    issuer: {
      'access-token-issuer': buildManifestField(
        'url',
        'Issuer claim for partner issued access tokens.',
        'yes',
        accessTokenIssuer
      )
    }
  };
  console.log('');
  logInfo('Optional claim containing the EHR identity of an end user');
  logInfo('DAC will only prompt for this value if the partner includes it in the manifest.');
  logInfo('If it\'s not included in the manifest, it will default to \'sub\'.');
  console.log('');
  if (await confirm({ message: 'Collect user identity claim?', default: false })) {
    const claim = await input({
      message: 'Default user identity claim name:',
      default: 'sub',
      validate: (value: string) => (value.trim() ? true : 'Claim name is required')
    });

    const userIdentityRequired = await yesNo('Is the user identity claim required?', 'no');

    clientAuth.issuer['user-identity-claim'] = buildManifestField(
      'string',
      'Optional claim containing the EHR identity of an end user. Defaults to "sub".',
      userIdentityRequired,
      claim
    );
  }
 console.log('');
  logInfo('Optional claim containing the Microsoft environment identifier.');
  console.log('');
  if (await confirm({ message: 'Collect customer identity claim?', default: false })) {
    const claim = await input({
      message: 'Default customer identity claim name:',
      default: 'http://customerid.dragon.com',
      validate: (value: string) => (value.trim() ? true : 'Claim name is required')
    });

    const customerIdentityRequired = await yesNo('Is the customer identity claim required?', 'no');

    clientAuth.issuer['customer-identity-claim'] = buildManifestField(
      'string',
      'Optional claim containing the Microsoft environment identifier.',
      customerIdentityRequired,
      claim
    );
  }
 console.log('🌐 Web Launch');
  logInfo('Select the launch capabilities supported by this manifest.');
  logInfo(
    'Dragon Copilot embedded web UI offers SMART on FHIR and Token Launch. Partners must support one or both options.'
  );
  logInfo(
    'SMART on FHIR documentation: https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/smart-fhir-app-launch'
  );
  logInfo(
    'Token Launch documentation: https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/embedded-desktop/token-launch'
  );
  console.log('');

  let webLaunchSof: NamedFieldConfig | undefined;
  const configureSof = await confirm({ message: 'Configure SMART on FHIR web launch issuer?', default: false });
  if (configureSof) {
    const sofIssuerInput = await input({
      message: 'Default SMART on FHIR issuer URL (leave blank for none):',
      validate: (value: string) => {
        const trimmed = value.trim();
        return trimmed ? validateUrl(trimmed) : true;
      }
    });
    const sofIssuer = sofIssuerInput.trim();

    webLaunchSof = {
      name: 'access-token-issuer',
      type: 'url',
      description: 'The value of the issuer claim when invoking the Dragon Copilot SMART on FHIR endpoint.',
      required: 'yes'
    };

    if (sofIssuer) {
      webLaunchSof['default-value'] = sofIssuer;
    }
  }

  const requireToken = !configureSof;
  if (requireToken) {
    logInfo('Token Launch configuration is required when SMART on FHIR is not enabled.');
  }

  let webLaunchToken: InstanceConfig['web-launch-token'] | undefined;
  const configureToken = requireToken
    ? true
    : await confirm({ message: 'Configure Token Launch?', default: true });

  if (configureToken) {
    const useClientAuth = await yesNo('Use client authentication for web launch tokens?', 'yes');
    const allowMultipleWebIssuers = await yesNo('Allow multiple issuers for web launch tokens?', 'no');

    webLaunchToken = {
      'use-client-authentication': useClientAuth,
      'allow-multiple-issuers': allowMultipleWebIssuers
    };

    if (useClientAuth === 'yes') {
      if (allowMultipleWebIssuers === 'yes') {
        webLaunchToken.issuer = await gatherNamedIssuerFields();
      }
    } else {
      const defaultIssuerInput = await input({
        message: 'Default access token issuer for web launch tokens (leave blank for none):',
        validate: (value: string) => {
          const trimmed = value.trim();
          return trimmed ? validateUrl(trimmed) : true;
        }
      });
      const defaultIssuer = defaultIssuerInput.trim();

      const issuerFields: NamedFieldConfig[] = [
        {
          name: 'access-token-issuer',
          ...buildManifestField(
            'url',
            'The value of the issuer claim for partner issued, user scoped access tokens.',
            'yes',
            defaultIssuer
          )
        }
      ];

      const collectUserIdentity = await yesNo('Collect user identity claim for web launch tokens?', 'no');

      if (collectUserIdentity === 'yes') {
        const identityDefault = await input({
          message: 'Default user identity claim value (optional):',
          default: 'sub'
        });

        const identityRequired = await yesNo('Is the web launch user identity claim required?', 'no');

        issuerFields.push({
          name: 'user-identity-claim',
          ...buildManifestField(
            'string',
            'Optional name of claim containing the EHR identity of an end user. Defaults to \'sub\' if not collected.',
            identityRequired,
            identityDefault
          )
        });
      }

      webLaunchToken.issuer = issuerFields;
    }
  }

  const result: {
    clientAuth: InstanceConfig['client-authentication'];
    webLaunchSof?: NamedFieldConfig;
    webLaunchToken?: InstanceConfig['web-launch-token'];
  } = { clientAuth };

  if (webLaunchSof) {
    result.webLaunchSof = webLaunchSof;
  }

  if (webLaunchToken) {
    result.webLaunchToken = webLaunchToken;
  }

  return result;
};

const summarizeWebLaunchConfig = ({
  clientAuth,
  webLaunchSof,
  webLaunchToken
}: {
  clientAuth: InstanceConfig['client-authentication'];
  webLaunchSof?: NamedFieldConfig;
  webLaunchToken?: InstanceConfig['web-launch-token'];
}): string[] => {
  const lines: string[] = [];
  const accessIssuer = clientAuth.issuer['access-token-issuer']['default-value'] ?? '(none)';
  lines.push(`Allow multiple access issuers: ${clientAuth['allow-multiple-issuers'] ?? 'no'}`);
  lines.push(`Access token issuer default: ${accessIssuer}`);

  if (clientAuth.issuer['user-identity-claim']) {
    const claim = clientAuth.issuer['user-identity-claim'];
    lines.push(
      `User identity claim: ${claim['default-value'] ?? '(none)'} (required: ${claim.required})`
    );
  } else {
    lines.push('User identity claim collected: no');
  }

  if (clientAuth.issuer['customer-identity-claim']) {
    const claim = clientAuth.issuer['customer-identity-claim'];
    lines.push(
      `Customer identity claim: ${claim['default-value'] ?? '(none)'} (required: ${claim.required})`
    );
  } else {
    lines.push('Customer identity claim collected: no');
  }

  if (webLaunchSof) {
    lines.push(`SMART on FHIR issuer default: ${webLaunchSof['default-value'] ?? '(none)'}`);
  } else {
    lines.push('SMART on FHIR issuer configured: no');
  }

  const token = webLaunchToken;
  if (token) {
    lines.push(`Web launch tokens reuse client auth: ${token['use-client-authentication'] ?? 'no'}`);
    lines.push(`Web launch token allow multiple issuers: ${token['allow-multiple-issuers'] ?? 'no'}`);

    if (token.issuer?.length) {
      const issuerFieldNames = token.issuer
        .map(field => field.name ?? field.type ?? 'field')
        .join(', ');
      lines.push(`Web launch token issuer fields: ${issuerFieldNames}`);
    } else if (token['use-client-authentication'] === 'yes') {
      lines.push('Web launch token issuer fields: reuse client authentication settings');
    } else {
      lines.push('Web launch token issuer fields: none configured');
    }
  } else {
    lines.push('Web launch token configuration: not configured');
  }

  return lines;
};

const summarizeContextRetrieval = (items: ContextRetrievalItem[] | null): string[] => {
  if (!items || !items.length) {
    return ['Context retrieval configured: no'];
  }

  return [
    'Context retrieval configured: yes',
    `Context items collected: ${items.length}`,
    `Context keys: ${items.map(item => item.name).join(', ')}`
  ];
};

export async function runPartnerManifestWizard(
  defaults?: Partial<IntegrationDetails>
): Promise<PartnerIntegrationManifest> {
  logSectionHeading('🤝', 'Partner Details');
  console.log('');
  const integration = await promptIntegrationDetails(defaults);

  logSectionHeading('🔐', 'Server Authentication');
  logInfo(
    'This section is for authenticating the partner server calling DDE/Partner API.');
  logInfo(
    'Using EntraId as an identity solution https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/partner-apis/entra-id'
  );
  logInfo('Define each issuer, identity claim and allowed claim values. Add at least one entry.');
  console.log('');
  const serverAuthentication = await collectWithReview(
    'Server authentication',
    gatherServerAuthenticationEntries,
    summarizeServerAuthentication
  );

  logSectionHeading('📝', 'Note Sections');
  logInfo('Choose how Dragon Copilot should map generated sections.');
  const noteSections = await collectWithReview('Note sections', gatherNoteSections, summarizeNoteSections);

  logSectionHeading('⚙️', 'Instance Configuration');
  console.log('');
  const { clientAuth, webLaunchSof, webLaunchToken } = await collectWithReview(
    'Web launch configuration',
    gatherClientAuthAndWeb,
    summarizeWebLaunchConfig
  );

  const contextItems = await collectWithReview(
    'Context retrieval configuration',
    gatherContextRetrievalItems,
    summarizeContextRetrieval
  );

  const instance: InstanceConfig = {
    'client-authentication': clientAuth
  };

  if (webLaunchSof) {
    instance['web-launch-sof'] = webLaunchSof;
  }

  if (webLaunchToken) {
    instance['web-launch-token'] = webLaunchToken;
  }

  if (contextItems && contextItems.length) {
    instance['context-retrieval'] = { instance: contextItems };
  }

  return {
    name: integration.name,
    description: integration.description,
    version: integration.version,
    'partner-id': integration.partnerId,
    'clinical-application-name': integration.clinicalApplicationName,
    'server-authentication': serverAuthentication,
    'note-sections': noteSections,
    instance
  };
}