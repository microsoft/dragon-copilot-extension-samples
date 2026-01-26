import { getDefaultNoteSections, normalizeNoteSections } from '../shared/note-sections.js';
import { buildIntegrationDescription } from '../shared/integration-description.js';
import { cloneContextItem } from '../shared/context-items.js';
const buildContextItems = (...names) => names
    .map(name => cloneContextItem(name))
    .filter((item) => Boolean(item));
const adjustContextRequired = (items, overrides) => items.map(item => {
    const override = overrides[item.name];
    if (override !== undefined) {
        return { ...item, required: override };
    }
    return item;
});
const defaultNoteSections = getDefaultNoteSections();
const defaultInstance = {
    'client-authentication': {
        'allow-multiple-issuers': 'yes',
        issuer: {
            'access-token-issuer': {
                type: 'url',
                description: 'The value of the issuer claim for partner issued, user scoped access tokens.',
                required: 'yes'
            },
            'user-identity-claim': {
                type: 'string',
                description: 'Optional claim containing the EHR identity of an end user. Defaults to sub if not collected.',
                required: 'no',
                'default-value': 'sub'
            },
            'customer-identity-claim': {
                type: 'string',
                description: 'Optional claim containing the Microsoft environment identifier.',
                required: 'no',
                'default-value': 'http://customerid.dragon.com'
            }
        }
    },
    'web-launch-sof': {
        name: 'access-token-issuer',
        type: 'url',
        description: 'The value of the issuer claim when invoking the Dragon Copilot SMART on FHIR endpoint.',
        required: 'yes',
        'default-value': 'https://launch.partnerhealthworks.com/context'
    },
    'web-launch-token': {
        'use-client-authentication': 'yes'
    },
    'context-retrieval': {
        instance: buildContextItems('base_url', 'in-bound-client-id', 'out-bound-client-id', 'out-bound-issuer', 'out-bound-secret')
    }
};
const cloneInstance = () => JSON.parse(JSON.stringify(defaultInstance));
const createBaseManifest = (overrides = {}) => {
    const noteSections = normalizeNoteSections(overrides['note-sections'] ?? defaultNoteSections);
    const manifestName = overrides.name ?? 'partner-integration';
    const manifestDescription = buildIntegrationDescription(manifestName);
    const manifest = {
        name: manifestName,
        description: manifestDescription,
        version: overrides.version ?? '0.0.1',
        'connector-id': overrides['connector-id'] ?? 'contoso.healthworks',
        'clinical-application-name': overrides['clinical-application-name'] ?? 'Contoso HealthWorks EHR',
        'server-authentication': overrides['server-authentication'] ?? [
            {
                issuer: 'https://login.partnerhealthworks.com/oauth2/default',
                identity_claim: 'azp',
                identity_value: ['a0bb517c-d6de-449f-bfe4-f0bc3f912c66']
            }
        ],
        'note-sections': JSON.parse(JSON.stringify(noteSections)),
        instance: overrides.instance ? overrides.instance : cloneInstance()
    };
    return manifest;
};
const ehrInstance = {
    'client-authentication': {
        'allow-multiple-issuers': 'yes',
        issuer: {
            'access-token-issuer': {
                type: 'url',
                description: 'The value of the issuer claim for partner issued, user scoped access tokens.',
                required: 'yes',
                'default-value': 'https://login.contoso-ehr.com/oauth2/default'
            },
            'user-identity-claim': {
                type: 'string',
                description: 'Optional claim containing the EHR identity of an end user.',
                required: 'no',
                'default-value': 'sub'
            },
            'customer-identity-claim': {
                type: 'string',
                description: 'Optional claim containing the Microsoft environment identifier.',
                required: 'no',
                'default-value': 'http://customerid.dragon.com'
            }
        }
    },
    'web-launch-sof': {
        name: 'access-token-issuer',
        type: 'url',
        description: 'Issuer claim when invoking the Dragon Copilot SMART on FHIR endpoint.',
        required: 'yes',
        'default-value': 'https://launch.contoso-ehr.com/context'
    },
    'web-launch-token': {
        'use-client-authentication': 'no',
        'allow-multiple-issuers': 'no',
        issuer: [
            {
                name: 'access-token-issuer',
                type: 'url',
                description: 'Issuer claim for partner-issued web launch tokens.',
                required: 'yes',
                'default-value': 'https://login.contoso-ehr.com/oauth2/default'
            },
            {
                name: 'user-identity-claim',
                type: 'string',
                description: 'Optional claim containing the EHR identity of an end user.',
                required: 'no',
                'default-value': 'sub'
            }
        ]
    },
    'context-retrieval': {
        instance: buildContextItems('base_url', 'ehr-user_id', 'in-bound-issuer', 'out-bound-issuer', 'out-bound-client-id')
    }
};
const apiInstance = {
    'client-authentication': {
        'allow-multiple-issuers': 'no',
        issuer: {
            'access-token-issuer': {
                type: 'url',
                description: 'Issuer claim for service-to-service access tokens.',
                required: 'yes',
                'default-value': 'https://identity.api-hub.contoso.com/oauth2/default'
            },
            'user-identity-claim': {
                type: 'string',
                description: 'Claim containing the calling system identity.',
                required: 'no',
                'default-value': 'azp'
            }
        }
    },
    'web-launch-token': {
        'use-client-authentication': 'yes'
    },
    'context-retrieval': {
        instance: adjustContextRequired(buildContextItems('base_url', 'in-bound-client-id', 'out-bound-client-id', 'out-bound-secret'), { 'out-bound-secret': 'no' })
    }
};
const dataSyncInstance = {
    'client-authentication': {
        'allow-multiple-issuers': 'yes',
        issuer: {
            'access-token-issuer': {
                type: 'url',
                description: 'Issuer claim for synchronization service tokens.',
                required: 'yes',
                'default-value': 'https://login.sync.contoso.com/oauth2/default'
            },
            'user-identity-claim': {
                type: 'string',
                description: 'Claim representing the partner service principal.',
                required: 'no',
                'default-value': 'sub'
            },
            'customer-identity-claim': {
                type: 'string',
                description: 'Claim containing the Microsoft environment identifier.',
                required: 'no',
                'default-value': 'http://customerid.dragon.com'
            }
        }
    },
    'web-launch-sof': {
        name: 'access-token-issuer',
        type: 'url',
        description: 'Issuer claim for synchronization SMART on FHIR launch.',
        required: 'yes',
        'default-value': 'https://sync.contoso.com/launch'
    },
    'web-launch-token': {
        'use-client-authentication': 'no',
        'allow-multiple-issuers': 'yes',
        issuer: [
            {
                name: 'access-token-issuer',
                type: 'url',
                description: 'Issuer claim for outbound synchronization tokens.',
                required: 'yes',
                'default-value': 'https://customer.sync.contoso.com/oauth2/default'
            }
        ]
    },
    'context-retrieval': {
        instance: buildContextItems('base_url', 'in-bound-client-id', 'out-bound-issuer', 'out-bound-client-id', 'out-bound-secret')
    }
};
const customInstance = {
    'client-authentication': {
        'allow-multiple-issuers': 'no',
        issuer: {
            'access-token-issuer': {
                type: 'url',
                description: 'Issuer claim for partner-issued access tokens.',
                required: 'yes',
                'default-value': 'https://login.custom-partner.com/oauth2/default'
            }
        }
    },
    'web-launch-token': {
        'use-client-authentication': 'yes'
    },
    'context-retrieval': {
        instance: buildContextItems('base_url')
    }
};
const templates = {
    'ehr-integration': {
        description: 'Sample EHR Connector Manifest with SMART on FHIR launch support',
        manifest: createBaseManifest({
            name: 'ehr-integration',
            ['connector-id']: 'contoso-ehr-suite',
            ['server-authentication']: [
                {
                    issuer: 'https://login.contoso-ehr.com/oauth2/default',
                    identity_claim: 'azp',
                    identity_value: [
                        'a0bb517c-d6de-449f-bfe4-f0bc3f912c66',
                        '2f03b7e0-7569-4c5d-9278-70590a10ce34'
                    ]
                },
                {
                    issuer: 'https://sts.contoso-ehr.com/oauth2/default',
                    identity_claim: 'azp',
                    identity_value: ['f9853c9a-25de-4564-a2fa-1a601c913a45']
                }
            ],
            ['note-sections']: normalizeNoteSections({
                hpi: ['hpi', 'chief-complaint'],
                assessment: ['assessment', 'plan'],
                results: ['results'],
                medications: ['medications'],
                allergies: null
            }),
            instance: ehrInstance
        })
    },
    'api-connector': {
        description: 'API connector manifest with streamlined service-to-service configuration',
        manifest: createBaseManifest({
            name: 'api-connector',
            ['connector-id']: 'contoso.api-hub',
            ['server-authentication']: [
                {
                    issuer: 'https://identity.api-hub.contoso.com/oauth2/default',
                    identity_claim: 'azp',
                    identity_value: ['ebe62346-179a-44b0-8cf2-880b4b2871cc']
                }
            ],
            ['note-sections']: normalizeNoteSections({
                assessment: ['assessment'],
                results: null,
                procedures: null
            }),
            instance: apiInstance
        })
    },
    'data-sync': {
        description: 'Data synchronization manifest highlighting inbound/outbound configuration',
        manifest: createBaseManifest({
            name: 'data-sync',
            ['connector-id']: 'contoso.sync.platform',
            ['server-authentication']: [
                {
                    issuer: 'https://login.sync.contoso.com/oauth2/default',
                    identity_claim: 'azp',
                    identity_value: ['71d46c61-715b-4e69-b1f7-76d3b4ab97d8']
                },
                {
                    issuer: 'https://customer.sync.contoso.com/oauth2/default',
                    identity_claim: 'sub',
                    identity_value: ['bd864f73-1130-452f-98c8-4d63d1c6a001']
                }
            ],
            ['note-sections']: normalizeNoteSections({
                hpi: ['hpi'],
                assessment: ['assessment', 'plan'],
                results: ['results'],
                procedures: ['procedures'],
                'review-of-systems': null
            }),
            instance: dataSyncInstance
        })
    },
    custom: {
        description: 'Minimal manifest to customize from scratch',
        manifest: createBaseManifest({
            name: 'custom-integration',
            ['connector-id']: 'custom.partner',
            ['server-authentication']: [
                {
                    issuer: 'https://login.custom-partner.com/oauth2/default',
                    identity_claim: 'azp',
                    identity_value: ['9c4ebfd9-0407-47a2-902f-3e0f2a5a9620']
                }
            ],
            ['note-sections']: normalizeNoteSections({
                assessment: null,
                results: null,
                procedures: null
            }),
            instance: customInstance
        })
    }
};
export async function getTemplate(templateName) {
    return templates[templateName] || null;
}
export function listTemplates() {
    return Object.keys(templates);
}
export function getTemplateDescription(templateName) {
    const template = templates[templateName];
    return template ? template.description : 'Unknown template';
}
//# sourceMappingURL=index.js.map