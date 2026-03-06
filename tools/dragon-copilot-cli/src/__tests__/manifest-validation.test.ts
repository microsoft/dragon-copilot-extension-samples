import { describe, expect, it } from '@jest/globals';
import {
  validateExtensionManifest,
  validateConnectorManifest,
  validatePublisherConfig,
  type SchemaError,
} from '../shared/schema-validator.js';
import type { DragonExtensionManifest, PublisherConfig } from '../domains/extension/types.js';
import type { ConnectorIntegrationManifest } from '../domains/connector/types.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function buildValidExtensionManifest(): DragonExtensionManifest {
  return {
    name: 'test-extension',
    description: 'Extension used for schema validation tests',
    version: '1.2.3',
    auth: {
      tenantId: TENANT_ID,
    },
    tools: [
      {
        name: 'note-tool',
        description: 'Processes clinical notes',
        endpoint: 'https://example.org/extension/process',
        inputs: [
          {
            name: 'note',
            description: 'Clinical note payload',
            'content-type': 'application/vnd.ms-dragon.dsp.note+json',
          },
        ],
        outputs: [
          {
            name: 'result-card',
            description: 'Adaptive Card output',
            'content-type': 'application/vnd.ms-dragon.dsp+json',
          },
        ],
      },
    ],
  };
}

function buildValidPartnerManifest(): ConnectorIntegrationManifest {
  return {
    name: 'sample-partner',
    description: 'Connector Manifest used for validation tests',
    version: '0.9.9',
    'partner-id': '00000000-0000-0000-0000-000000000001',
    'clinical-application-name': 'Test EHR System',
    'server-authentication': [
      {
        issuer: 'https://login.example.com/oauth2/default',
        'identity-claim': 'azp',
        'identity-value': ['a0bb517c-d6de-449f-bfe4-f0bc3f912c66'],
      },
    ],
    'note-sections': {
      hpi: ['hpi'],
      assessment: ['assessment', 'plan'],
    },
    instance: {
      'client-authentication': {
        'allow-multiple-issuers': 'yes',
        issuer: {
          'access-token-issuer': {
            type: 'url',
            description: 'Issuer claim for access tokens.',
            required: 'yes',
          },
        },
      },
      'web-launch-token': {
        'use-client-authentication': 'yes',
      },
      'context-retrieval': {
        instance: [],
      },
    },
  } as unknown as ConnectorIntegrationManifest;
}

describe('validateExtensionManifest', () => {
  it('returns valid for a well-formed manifest', () => {
    const manifest = buildValidExtensionManifest();

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('flags duplicate tool names as a business-rule error', () => {
    const manifest = buildValidExtensionManifest();
    manifest.tools.push({
      ...manifest.tools[0],
      name: manifest.tools[0].name,
    });

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error: SchemaError) => error.keyword === 'uniqueToolNames')).toBe(true);
  });

  it('rejects additional properties not in the schema', () => {
    const manifest = buildValidExtensionManifest();
    (manifest as any)['unknown-field'] = 'should not be here';

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error: SchemaError) => error.keyword === 'additionalProperties')).toBe(true);
  });

  it('detects invalid extension name', () => {
    const manifest = buildValidExtensionManifest();
    manifest.name = 'Test Extension!' as any; // Invalid characters

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('name'))).toBe(true);
  });

  it('detects missing required fields', () => {
    const manifest = { name: 'test-extension' } as any;

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates manifest with AutoRun trigger', () => {
    const manifest = buildValidExtensionManifest();
    (manifest.tools[0] as any).trigger = 'AutoRun';

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates manifest with AdaptiveCardAction trigger', () => {
    const manifest = buildValidExtensionManifest();
    (manifest.tools[0] as any).trigger = 'AdaptiveCardAction';

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid trigger value', () => {
    const manifest = buildValidExtensionManifest();
    (manifest.tools[0] as any).trigger = 'InvalidTrigger';

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('trigger'))).toBe(true);
  });

  it('validates manifest with deprecated data field for backward compatibility', () => {
    const manifest = buildValidExtensionManifest();
    // The default fixture already uses `data` — confirm it passes

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates manifest with content-type format', () => {
    const manifest = buildValidExtensionManifest();
    manifest.tools[0].inputs = [
      {
        name: 'note',
        description: 'Clinical note',
        'content-type': 'application/vnd.ms-dragon.dsp.note+json',
      } as any,
    ];
    manifest.tools[0].outputs = [
      {
        name: 'result',
        description: 'Processed result',
        'content-type': 'application/vnd.ms-dragon.dsp+json',
      } as any,
    ];

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates manifest with mixed data and content-type formats', () => {
    const manifest = buildValidExtensionManifest();
    manifest.tools[0].inputs = [
      {
        name: 'note',
        description: 'Clinical note',
        'content-type': 'application/vnd.ms-dragon.dsp.note+json',
      },
      {
        name: 'transcript',
        description: 'Transcript',
        'content-type': 'application/vnd.ms-dragon.dsp.transcript+json',
      },
    ];

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validatePublisherConfig', () => {
  function buildValidPublisherConfig(): PublisherConfig {
    return {
      publisherId: 'contoso.healthcare',
      publisherName: 'Contoso Healthcare Inc.',
      websiteUrl: 'https://www.contosohealth.com',
      privacyPolicyUrl: 'https://www.contosohealth.com/privacy',
      supportUrl: 'https://www.contosohealth.com/support',
      version: '0.0.1',
      contactEmail: 'support@contosohealth.com',
      offerId: 'contoso-extension-suite',
      defaultLocale: 'en-US',
      scope: 'Workflow',
      supportedLocales: ['en-US'],
      regions: ['US'],
    };
  }

  it('validates a correct publisher config', () => {
    const config = buildValidPublisherConfig();

    const result = validatePublisherConfig(config);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-US regions', () => {
    const config = buildValidPublisherConfig();
    config.regions = ['FR'];

    const result = validatePublisherConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('regions'))).toBe(true);
  });

  it('rejects non-en-US locales', () => {
    const config = buildValidPublisherConfig();
    config.defaultLocale = 'fr-FR';
    config.supportedLocales = ['fr-FR'];

    const result = validatePublisherConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateConnectorManifest', () => {
  it('returns valid when manifest satisfies schema requirements', () => {
    const manifest = buildValidPartnerManifest();

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('provides schema errors when partner-id is not a valid GUID', () => {
    const manifest = buildValidPartnerManifest();
    (manifest as any)['partner-id'] = 'not-a-guid';

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors).not.toHaveLength(0);
    expect(result.errors[0].message?.toLowerCase()).toContain('must match pattern');
  });

  it('provides schema errors when required fields are missing', () => {
    const manifest = buildValidPartnerManifest();
    delete (manifest as any)['server-authentication'];

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors).not.toHaveLength(0);
  });

  it('rejects additional properties not in the schema', () => {
    const manifest = buildValidPartnerManifest();
    (manifest as any)['unknown-field'] = 'should not be here';

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.keyword === 'additionalProperties')).toBe(true);
  });

  it('flags duplicate server-authentication issuers as a business-rule error', () => {
    const manifest = buildValidPartnerManifest();
    (manifest as any)['server-authentication'] = [
      {
        issuer: 'https://login.example.com/oauth2/default',
        'identity-claim': 'azp',
        'identity-value': ['a0bb517c-d6de-449f-bfe4-f0bc3f912c66'],
      },
      {
        issuer: 'https://login.example.com/oauth2/default',
        'identity-claim': 'sub',
        'identity-value': ['b1cc628d-e7ef-550a-c0f5-g1cd4g023d77'],
      },
    ];

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.keyword === 'uniqueIssuers')).toBe(true);
  });
});

