import { describe, expect, it } from '@jest/globals';
import {
  validateExtensionManifest,
  validatePartnerManifest,
  type SchemaError,
} from '../shared/schema-validator.js';
import type { DragonExtensionManifest } from '../domains/extension/types.js';
import type { PartnerIntegrationManifest } from '../domains/partner/types.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function buildValidExtensionManifest(): DragonExtensionManifest {
  return {
    manifestVersion: 3,
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
            data: 'DSP/Note',
          },
        ],
        outputs: [
          {
            name: 'result-card',
            description: 'Adaptive Card output',
            data: 'DSP',
          },
        ],
      },
    ],
    automationScripts: [
      {
        name: 'note-analyzer-script',
        description: 'Processes notes asynchronously',
        entryPoint: 'scripts/note-analyzer/index.js',
        runtime: 'nodejs18',
        timeoutSeconds: 120,
      },
    ],
    eventTriggers: [
      {
        name: 'note-created-trigger',
        description: 'Fires when a note is created',
        eventType: 'note.created',
        scriptName: 'note-analyzer-script',
      },
    ],
    dependencies: [
      {
        name: 'clinical-service',
        version: '1.0.0',
        type: 'service',
      },
    ],
  };
}

function buildValidPartnerManifest(): PartnerIntegrationManifest {
  return {
    name: 'sample-partner',
    description: 'Partner manifest used for validation tests',
    version: '0.9.9',
    auth: {
      tenantId: TENANT_ID,
    },
    tools: [
      {
        name: 'ehr-sync',
        description: 'Synchronises data to an EHR',
        endpoint: 'https://partner.example.com/process',
        inputs: [
          {
            name: 'appointment',
            description: 'Appointment data payload',
            data: 'EHR/Appointment',
          },
        ],
        outputs: [
          {
            name: 'sync-status',
            description: 'Integration status payload',
            data: 'API/Response',
          },
        ],
      },
    ],
  } as unknown as PartnerIntegrationManifest;
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

  it('flags event triggers referencing missing scripts', () => {
    const manifest = buildValidExtensionManifest();
    manifest.eventTriggers = [
      {
        name: 'invalid-trigger',
        eventType: 'note.created',
        scriptName: 'missing-script',
      },
    ];

    const result = validateExtensionManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error: SchemaError) => error.keyword === 'missingAutomationScript')).toBe(true);
  });
});

describe('validatePartnerManifest', () => {
  it('returns valid when manifest satisfies schema requirements', () => {
    const manifest = buildValidPartnerManifest();

    const result = validatePartnerManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('provides schema errors when manifest contains invalid values', () => {
    const manifest = buildValidPartnerManifest();
    (manifest as any).tools[0].endpoint = 'not-a-url';

    const result = validatePartnerManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors).not.toHaveLength(0);
    expect(result.errors[0].message?.toLowerCase()).toContain('must match format "uri"');
  });
});
