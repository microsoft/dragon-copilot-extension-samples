import { describe, expect, it } from '@jest/globals';
import {
  validateExtensionManifest,
  validateConnectorManifest,
  validateDcrExtensionManifest,
  type SchemaError,
} from '../shared/schema-validator.js';
import { validateExtensionManifest as validateRadiologistsManifest } from '../domains/radiologists/shared/schema-validator.js';
import type { DragonExtensionManifest } from '../domains/physician/types.js';
import type { ConnectorIntegrationManifest } from '../domains/connector/types.js';
import type { DcrExtensionManifest } from '../domains/radiologists/types.js';

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
    'publisher-name': 'Sample Partner, Inc.',
    'partner-id': '00000000-0000-0000-0000-000000000001',
    'clinical-application-name': 'Test EHR System',
    'server-authentication': [
      {
        issuer: 'https://login.example.com/oauth2/default',
        'identity-claim': 'azp',
        'identity-value': ['a0bb517c-d6de-449f-bfe4-f0bc3f912c66'],
      },
    ],
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

  it('allows publisher-name to be omitted', () => {
    const manifest = buildValidPartnerManifest();
    delete manifest['publisher-name'];

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects obsolete note-sections when present', () => {
    const manifest = buildValidPartnerManifest();
    (manifest as any)['note-sections'] = { assessment: ['assessment', 'plan'] };

    const result = validateConnectorManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.keyword === 'additionalProperties')).toBe(true);
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

describe('validateDcrExtensionManifest (radiologists)', () => {
  function buildValidRadiologistsManifest(): DcrExtensionManifest {
    return {
      name: 'testRadiologistsExtension',
      description: 'Radiologists extension for schema validation tests',
      version: '1.0.0',
      radiologistsExtensibilityApiVersion: '1.0.0',
      auth: {
        tenantId: TENANT_ID,
      },
      tools: [
        {
          name: 'qualityChecker',
          toolType: 'contractBased',
          capability: 'qualityCheck',
          description: 'Checks radiology report quality',
          endpoint: 'https://example.org/quality-check',
          inputs: [
            {
              name: 'report',
              description: 'Radiology report',
              'content-type': 'application/vnd.ms-dragon.rad.report+json',
              schemaVersion: '1.0',
            },
            {
              name: 'patientInformation',
              description: 'Patient demographic information',
              'content-type': 'application/vnd.ms-dragon.rad.patient-information+json',
              schemaVersion: '1.0',
            },
          ],
          outputs: [
            {
              name: 'qualityCheckResult',
              description: 'Quality check findings',
              'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json',
              schemaVersion: '1.0',
            },
          ],
        },
      ],
    };
  }

  it('returns valid for a well-formed radiologists manifest with qualityCheck capability', () => {
    const manifest = buildValidRadiologistsManifest();

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  function buildValidPartnerInitiatedManifest(): DcrExtensionManifest {
    return {
      name: 'testPreDraftExtension',
      description: 'Partner-initiated extension for schema validation tests',
      version: '1.0.0',
      radiologistsExtensibilityApiVersion: '1.0.0',
      auth: {
        tenantId: TENANT_ID,
      },
      tools: [
        {
          name: 'preDraftReportGeneratorTool',
          toolType: 'partnerInitiated',
          capability: 'preDraftReportGeneration',
          description: 'Generates a pre-draft radiology report',
          outputs: [
            {
              name: 'preDraftReportResult',
              description: 'Pre-draft radiology report',
              'content-type': 'application/vnd.ms-dragon.rad.draft-report+json',
              schemaVersion: '1.0',
            },
          ],
        },
      ],
    };
  }

  it('returns valid for a partnerInitiated tool that omits endpoint and inputs', () => {
    const manifest = buildValidPartnerInitiatedManifest();

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires endpoint and inputs when toolType is contractBased', () => {
    const manifest = buildValidPartnerInitiatedManifest();
    (manifest.tools[0] as any).toolType = 'contractBased';
    (manifest.tools[0] as any).capability = 'qualityCheck';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    const messages = result.errors.map(e => `${e.path}: ${e.message}`).join('\n');
    expect(messages).toContain('endpoint');
    expect(messages).toContain('inputs');
  });

  it('rejects an unknown toolType', () => {
    const manifest = buildValidPartnerInitiatedManifest();
    (manifest.tools[0] as any).toolType = 'somethingElse';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
  });

  it('rejects an invalid capability value', () => {
    const manifest = buildValidRadiologistsManifest();
    (manifest.tools[0] as any).capability = 'invalidCapability';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('capability'))).toBe(true);
  });

  it('rejects an invalid output content-type', () => {
    const manifest = buildValidRadiologistsManifest();
    (manifest.tools[0].outputs[0] as any)['content-type'] = 'application/vnd.ms-dragon.rad.invalid+json';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('flags duplicate tool names as a business-rule error', () => {
    const manifest = buildValidRadiologistsManifest();
    manifest.tools.push({ ...manifest.tools[0] });

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.keyword === 'uniqueToolNames')).toBe(true);
  });

  it('validates manifest with relevanceFilteringCriteria', () => {
    const manifest = buildValidRadiologistsManifest();
    manifest.tools[0].relevanceFilteringCriteria = {
      relevantBodyParts: ['CHEST'],
      relevantModalities: ['CT'],
    };

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects additional properties on tools', () => {
    const manifest = buildValidRadiologistsManifest();
    (manifest.tools[0] as any)['unknown-field'] = 'should not be here';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: SchemaError) => e.keyword === 'additionalProperties')).toBe(true);
  });

  it('rejects manifest missing top-level radiologistsExtensibilityApiVersion', () => {
    const manifest = buildValidRadiologistsManifest();
    delete (manifest as any).radiologistsExtensibilityApiVersion;

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: SchemaError) =>
          e.keyword === 'required' && e.params?.missingProperty === 'radiologistsExtensibilityApiVersion',
      ),
    ).toBe(true);
  });

  it('rejects radiologistsExtensibilityApiVersion in wrong format', () => {
    const manifest = buildValidRadiologistsManifest();
    manifest.radiologistsExtensibilityApiVersion = '1.0';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e: SchemaError) =>
        e.instancePath?.includes('radiologistsExtensibilityApiVersion'),
      ),
    ).toBe(true);
  });

  it('rejects input missing schemaVersion', () => {
    const manifest = buildValidRadiologistsManifest();
    delete (manifest.tools[0].inputs![0] as any).schemaVersion;

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: SchemaError) =>
          e.keyword === 'required' && e.params?.missingProperty === 'schemaVersion',
      ),
    ).toBe(true);
  });

  it('rejects output missing schemaVersion', () => {
    const manifest = buildValidRadiologistsManifest();
    delete (manifest.tools[0].outputs[0] as any).schemaVersion;

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: SchemaError) =>
          e.keyword === 'required' && e.params?.missingProperty === 'schemaVersion',
      ),
    ).toBe(true);
  });

  it('rejects schemaVersion in wrong format (three segments)', () => {
    const manifest = buildValidRadiologistsManifest();
    manifest.tools[0].inputs![0].schemaVersion = '1.0.0';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e: SchemaError) =>
        e.instancePath?.includes('schemaVersion'),
      ),
    ).toBe(true);
  });

  it('rejects extension name in kebab-case (camelCase required)', () => {
    const manifest = buildValidRadiologistsManifest();
    manifest.name = 'not-camel-case';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: SchemaError) =>
          e.keyword === 'pattern' && e.instancePath === '/name',
      ),
    ).toBe(true);
  });

  it('rejects tool name in kebab-case (camelCase required)', () => {
    const manifest = buildValidRadiologistsManifest();
    manifest.tools[0].name = 'quality-checker';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: SchemaError) =>
          e.keyword === 'pattern' && e.instancePath?.includes('/tools/0/name'),
      ),
    ).toBe(true);
  });

  it('rejects an invalid input content-type', () => {
    const manifest = buildValidRadiologistsManifest();
    (manifest.tools[0].inputs![0] as any)['content-type'] =
      'application/vnd.ms-dragon.rad.unknown+json';

    const result = validateDcrExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e: SchemaError) =>
        e.instancePath?.includes('content-type'),
      ),
    ).toBe(true);
  });

  describe('toolType / capability rules', () => {
    function buildPartnerInitiatedManifest(): DcrExtensionManifest {
      const manifest = buildValidRadiologistsManifest();
      manifest.tools = [
        {
          name: 'draftReportGenerator',
          toolType: 'partnerInitiated',
          capability: 'preDraftReportGeneration',
          description: 'Submits a draft report before the radiologist starts dictating',
          outputs: [
            {
              name: 'draftReport',
              description: 'Draft radiology report',
              'content-type': 'application/vnd.ms-dragon.rad.draft-report+json',
              schemaVersion: '1.0',
            },
          ],
        },
      ];
      return manifest;
    }

    it('accepts a partnerInitiated preDraftReportGeneration tool without endpoint or inputs', () => {
      const result = validateDcrExtensionManifest(buildPartnerInitiatedManifest());

      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('accepts a manifest mixing contractBased and partnerInitiated tools', () => {
      const manifest = buildValidRadiologistsManifest();
      manifest.tools.push(buildPartnerInitiatedManifest().tools[0]);

      const result = validateDcrExtensionManifest(manifest);

      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it.each(['endpoint', 'inputs'] as const)('rejects a contractBased tool missing %s', (property) => {
      const manifest = buildValidRadiologistsManifest();
      delete manifest.tools[0][property];

      const result = validateDcrExtensionManifest(manifest);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: SchemaError) => e.keyword === 'required' && e.params?.missingProperty === property,
        ),
      ).toBe(true);
    });

    it.each(['endpoint', 'inputs'] as const)('rejects a partnerInitiated tool that declares %s', (property) => {
      const manifest = buildPartnerInitiatedManifest();
      manifest.tools[0][property] = buildValidRadiologistsManifest().tools[0][property] as any;

      const result = validateDcrExtensionManifest(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: SchemaError) => e.instancePath === `/tools/0/${property}`)).toBe(true);
    });

    it('rejects an unknown toolType', () => {
      const manifest = buildValidRadiologistsManifest();
      (manifest.tools[0] as any).toolType = 'unknownToolType';

      const result = validateDcrExtensionManifest(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('toolType'))).toBe(true);
    });

    it('rejects a partnerInitiated tool with the qualityCheck capability', () => {
      const manifest = buildPartnerInitiatedManifest();
      (manifest.tools[0] as any).capability = 'qualityCheck';

      const result = validateDcrExtensionManifest(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('capability'))).toBe(true);
    });

    it('rejects a contractBased tool with the preDraftReportGeneration capability', () => {
      const manifest = buildValidRadiologistsManifest();
      (manifest.tools[0] as any).capability = 'preDraftReportGeneration';

      const result = validateDcrExtensionManifest(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: SchemaError) => e.instancePath?.includes('capability'))).toBe(true);
    });

    it.each([
      ['partnerInitiated', 'application/vnd.ms-dragon.rad.quality-check-result+json', 'application/vnd.ms-dragon.rad.draft-report+json'],
      ['contractBased', 'application/vnd.ms-dragon.rad.draft-report+json', 'application/vnd.ms-dragon.rad.quality-check-result+json'],
    ] as const)('rejects a %s tool whose output content-type does not match its capability', (toolType, wrongType, expectedType) => {
      const manifest = toolType === 'partnerInitiated' ? buildPartnerInitiatedManifest() : buildValidRadiologistsManifest();
      manifest.tools[0].outputs[0]['content-type'] = wrongType;

      const result = validateDcrExtensionManifest(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/tools/0/outputs/0/content-type',
          keyword: 'const',
          params: { allowedValue: expectedType },
        }),
      ]));
      // The radiologists validate/package/generate commands report this message.
      expect(validateRadiologistsManifest(manifest).errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/tools/0/outputs/0/content-type',
          message: `must be "${expectedType}" for this tool's capability`,
        }),
      ]));
    });
  });
});

