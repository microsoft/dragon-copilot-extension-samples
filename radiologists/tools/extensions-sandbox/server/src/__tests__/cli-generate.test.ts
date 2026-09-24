import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import express from 'express';
import yaml from 'js-yaml';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { cliRouter } from '../routes/cli.js';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';

/**
 * Covers the Manifest Editor's "Generate Manifest" button: the sandbox runs the
 * CLI's manifest generation in-process (the synced core under `src/cli/radiologists`)
 * and hands back YAML the editor can load and validate.
 *
 * The guarantees pinned here are that generated YAML is schema-valid, that bad
 * wizard input is reported instead of silently producing a broken manifest, and
 * that repeated template generation stays independent.
 */

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const REPORT_CONTENT_TYPE = 'application/vnd.ms-dragon.rad.report+json';
const PATIENT_INFORMATION_CONTENT_TYPE = 'application/vnd.ms-dragon.rad.patient-information+json';

let server: Server;
let baseUrl = '';

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/cli', cliRouter);
  server = await listen(app);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  // fetch keeps connections alive, so close() alone would never resolve.
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

async function generate(body: unknown): Promise<{ status: number; body: any }> {
  const response = await fetch(`${baseUrl}/api/cli/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function customRequest(overrides: Record<string, unknown> = {}) {
  return {
    domain: 'radiologists',
    mode: 'custom',
    tenantId: TENANT_ID,
    extension: {
      name: 'myRadiologistsExtension',
      description: 'A Dragon Copilot radiologists extension',
      version: '0.0.1',
      radiologistsExtensibilityApiVersion: '1.0.0',
    },
    tool: {
      name: 'myRadiologistsTool',
      description: 'Processes radiology reports and imaging data',
      endpoint: 'https://api.example.com/radiologists/v1/process',
      inputTypes: [REPORT_CONTENT_TYPE, PATIENT_INFORMATION_CONTENT_TYPE],
      outputs: [{ name: 'qualityCheckResult', description: 'Quality check result', schemaVersion: '1.0' }],
    },
    ...overrides,
  };
}

describe('GET /api/cli/options', () => {
  it('describes the templates, choices, and defaults the wizard renders', async () => {
    const response = await fetch(`${baseUrl}/api/cli/options`);
    const options = await response.json();

    expect(response.status).toBe(200);
    expect(options.domain).toBe('radiologists');
    expect(options.templates).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'quality-check', toolCount: 1 })]),
    );
    expect(options.inputTypes.map((choice: { value: string }) => choice.value)).toEqual([
      REPORT_CONTENT_TYPE,
      PATIENT_INFORMATION_CONTENT_TYPE,
    ]);
    expect(options.capabilities).toEqual([{ name: 'Quality Check', value: 'qualityCheck' }]);
    expect(options.bodyParts.length).toBeGreaterThan(0);
    expect(options.modalities.length).toBeGreaterThan(0);
    expect(options.defaults.extensionName).toBe('myRadiologistsExtension');
  });
});

describe('POST /api/cli/generate (template mode)', () => {
  it('returns schema-valid YAML for a built-in template', async () => {
    const { status, body } = await generate({
      domain: 'radiologists',
      mode: 'template',
      template: 'quality-check',
      tenantId: TENANT_ID,
    });

    expect(status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.manifest).toEqual({
      name: 'sampleQualityCheckExtension',
      version: '0.0.1',
      toolCount: 1,
      capabilities: ['qualityCheck'],
    });

    const manifest = yaml.load(body.yaml) as ExtensionManifest;
    expect(manifest.auth.tenantId).toBe(TENANT_ID);
    expect(manifest.tools[0].endpoint).toBe('https://publisher.example.com/quality-check');
  });

  it('does not leak state between generations from the same template', async () => {
    const first = await generate({ mode: 'template', template: 'quality-check', tenantId: TENANT_ID });
    const second = await generate({
      mode: 'template',
      template: 'quality-check',
      tenantId: '00000000-0000-0000-0000-000000000002',
    });

    expect(yaml.load(first.body.yaml)).toEqual({
      ...(yaml.load(second.body.yaml) as ExtensionManifest),
      auth: { tenantId: TENANT_ID },
    });
  });

  it('rejects an unknown template and lists the valid ones', async () => {
    const { status, body } = await generate({ mode: 'template', template: 'not-a-template', tenantId: TENANT_ID });

    expect(status).toBe(400);
    expect(body.generated).toBe(false);
    expect(body.message).toContain('quality-check');
  });

  it('rejects inherited object keys as template names', async () => {
    for (const template of ['__proto__', 'constructor', 'toString']) {
      const { status, body } = await generate({ mode: 'template', template, tenantId: TENANT_ID });

      expect(status).toBe(400);
      expect(body.generated).toBe(false);
      expect(body.yaml).toBeUndefined();
      expect(body.message).toContain('quality-check');
    }
  });

  it('rejects a request with no template selected', async () => {
    const { status, body } = await generate({ mode: 'template', tenantId: TENANT_ID });

    expect(status).toBe(400);
    expect(body.message).toContain('template is required');
  });
});

describe('POST /api/cli/generate (custom mode)', () => {
  it('assembles inputs, outputs, and defaults from the wizard answers', async () => {
    const { status, body } = await generate(customRequest());

    expect(status).toBe(200);
    expect(body.valid).toBe(true);

    const manifest = yaml.load(body.yaml) as ExtensionManifest;
    expect(manifest.name).toBe('myRadiologistsExtension');
    expect(manifest.tools[0].toolType).toBe('contractBased');
    expect(manifest.tools[0].capability).toBe('qualityCheck');
    expect(manifest.tools[0].inputs.map((input) => input.name)).toEqual(['report', 'patientInformation']);
    expect(manifest.tools[0].outputs[0]['content-type']).toBe(
      'application/vnd.ms-dragon.rad.quality-check-result+json',
    );
    // Left unset by the wizard, so the tool is always considered.
    expect(manifest.tools[0].relevanceFilteringCriteria).toBeUndefined();
  });

  it('includes relevance filtering criteria when the user selects them', async () => {
    const { body } = await generate(
      customRequest({
        tool: {
          ...customRequest().tool,
          relevanceFilteringCriteria: { relevantBodyParts: ['CHEST'], relevantModalities: ['CT', 'MR'] },
        },
      }),
    );

    const manifest = yaml.load(body.yaml) as ExtensionManifest;
    expect(manifest.tools[0].relevanceFilteringCriteria).toEqual({
      relevantBodyParts: ['CHEST'],
      relevantModalities: ['CT', 'MR'],
    });
  });

  it('omits relevance filtering criteria when nothing was selected', async () => {
    const { body } = await generate(
      customRequest({
        tool: {
          ...customRequest().tool,
          relevanceFilteringCriteria: { relevantBodyParts: [], relevantModalities: [] },
        },
      }),
    );

    expect(body.yaml).not.toContain('relevanceFilteringCriteria');
  });

  it('reports schema violations against the generated YAML instead of returning a broken manifest', async () => {
    const { status, body } = await generate(
      customRequest({ extension: { ...customRequest().extension, name: 'not-camel-case' } }),
    );

    expect(status).toBe(422);
    expect(body.generated).toBe(true);
    expect(body.valid).toBe(false);
    // The YAML still comes back so the editor can show the problem in context.
    expect(body.yaml).toContain('not-camel-case');
    const nameError = body.errors.find((error: { path: string }) => error.path === '/name');
    expect(nameError).toBeDefined();
    expect(nameError.line).toBe(1);
    expect(nameError.hint).toContain('camelCase');
  });

  it('reports an unselected input type as a schema error', async () => {
    const { status, body } = await generate(
      customRequest({ tool: { ...customRequest().tool, inputTypes: [] } }),
    );

    expect(status).toBe(422);
    expect(body.errors.some((error: { path: string }) => error.path === '/tools/0/inputs')).toBe(true);
  });

  it('rejects a request with no tenant ID', async () => {
    const { status, body } = await generate(customRequest({ tenantId: '' }));

    expect(status).toBe(400);
    expect(body.generated).toBe(false);
    expect(body.message).toContain('tenant ID is required');
  });

  it('rejects a request with no tool', async () => {
    const { status, body } = await generate({ mode: 'custom', tenantId: TENANT_ID });

    expect(status).toBe(400);
    expect(body.message).toContain('tool definition is required');
  });

  it('rejects a request with no outputs', async () => {
    const { status, body } = await generate(
      customRequest({ tool: { ...customRequest().tool, outputs: [] } }),
    );

    expect(status).toBe(400);
    expect(body.message).toContain('output is required');
  });

  it('falls back to the CLI defaults for fields the caller left blank', async () => {
    const { status, body } = await generate(
      customRequest({
        extension: { name: 'myRadiologistsExtension', description: '', version: '', radiologistsExtensibilityApiVersion: '' },
        tool: { ...customRequest().tool, outputs: [{ name: 'qualityCheckResult', description: 'Quality check result', schemaVersion: '' }] },
      }),
    );

    expect(status).toBe(200);
    expect(body.valid).toBe(true);

    // A blank field means "not supplied", exactly as submitting an empty CLI
    // prompt accepts the offered default.
    const manifest = yaml.load(body.yaml) as ExtensionManifest;
    expect(manifest.description).toBe('A Dragon Copilot radiologists extension');
    expect(manifest.version).toBe('0.0.1');
    expect(manifest.radiologistsExtensibilityApiVersion).toBe('1.0.0');
    expect(manifest.tools[0].outputs[0].schemaVersion).toBe('1.0');
  });

  it('rejects a malformed output entry without leaking an internal error', async () => {
    const { status, body } = await generate(
      customRequest({ tool: { ...customRequest().tool, outputs: [null] } }),
    );

    expect(status).toBe(400);
    expect(body.generated).toBe(false);
    expect(body.message).toContain('Each output must be an object');
    // A TypeError message here would mean an internal fault was reported as a
    // client error with implementation detail attached.
    expect(body.message).not.toContain('Cannot read properties');
  });
});

describe('POST /api/cli/generate (unsupported domain)', () => {
  it('rejects domains the sandbox cannot validate', async () => {
    const { status, body } = await generate({ domain: 'physician', mode: 'template', template: 'quality-check' });

    expect(status).toBe(400);
    expect(body.message).toContain('radiologists');
  });
});
