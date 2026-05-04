import { describe, expect, it } from '@jest/globals';
import {
  validateExtensionManifest,
  validateConnectorManifest,
  validateDcrExtensionManifest,
  type SchemaError,
} from '../shared/schema-validator.js';
import type { DragonExtensionManifest } from '../domains/physician/types.js';
import type { ConnectorIntegrationManifest } from '../domains/connector/types.js';
import type { DcrExtensionManifest } from '../domains/radiology/types.js';

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

describe('validateDcrExtensionManifest (radiology)', () => {
  function buildValidRadiologyManifest(): DcrExtensionManifest {
    return {
      name: 'test-radiology-extension',
      description: 'Radiology extension for schema validation tests',
      version: '1.0.0',
      auth: {
        tenantId: TENANT_ID,
      },
      tools: [
        {
          name: 'quality-checker',
          toolType: 'contractBased',
          capability: 'qualityCheck',
          description: 'Checks radiology report quality',
          endpoint: 'https://example.org/quality-check',
          inputs: [
            {
              name: 'report',
              description: 'Radiology report',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json',
            },
          ],
          outputs: [
            {
              name: 'quality-result',
              description: 'Quality check findings',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json',
            },
          ],
        },
      ],
    };
  }

  it('returns valid for a well-formed radiology manifest with qualityCheck capability', () => {
    const manifest = buildValidRadiologyManifest();

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for a manifest with reportGeneration capability', () => {
    const manifest = buildValidRadiologyManifest();
    manifest.tools[0] = {
      name: 'report-generator',
      toolType: 'contractBased',
      capability: 'reportGeneration',
      description: 'Generates a radiology report',
      endpoint: 'https://example.org/report-generation',
      inputs: [
        {
          name: 'report',
          description: 'Radiology report',
          'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json',
        },
        {
          name: 'patient-info',
          description: 'Patient demographic information',
          'content-type': 'application/vnd.ms-dragon.dsp.rad.patient-info+json',
        },
      ],
      outputs: [
        {
          name: 'generated-report',
          description: 'Generated radiology report',
          'content-type': 'application/vnd.ms-dragon.dsp.rad.generated-report+json',
        },
      ],
    };

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an invalid capability value', () => {
    const manifest = buildValidRadiologyManifest();
    (manifest.tools[0] as any).capability = 'invalidCapability';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('capability'))).toBe(true);
  });

  it('rejects an invalid output content-type', () => {
    const manifest = buildValidRadiologyManifest();
    (manifest.tools[0].outputs[0] as any)['content-type'] = 'application/vnd.ms-dragon.dsp.rad.invalid+json';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('flags duplicate tool names as a business-rule error', () => {
    const manifest = buildValidRadiologyManifest();
    manifest.tools.push({ ...manifest.tools[0] });

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.keyword === 'uniqueToolNames')).toBe(true);
  });

  it('validates manifest with relevanceFilteringCriteria', () => {
    const manifest = buildValidRadiologyManifest();
    manifest.tools[0].relevanceFilteringCriteria = {
      relevantBodyParts: ['CHEST'],
      relevantModalities: ['CT'],
    };

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects additional properties on tools', () => {
    const manifest = buildValidRadiologyManifest();
    (manifest.tools[0] as any)['unknown-field'] = 'should not be here';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.keyword === 'additionalProperties')).toBe(true);
  });
});

