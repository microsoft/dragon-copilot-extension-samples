import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { manifestRouter } from '../routes/manifest.js';
import { sessionStore } from '../store/session.js';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';

/**
 * Covers the guarantee that `POST /api/manifest/execute` validates on both
 * sides of the call: inputs against the schemas for their declared
 * content-types before the extension is reached, and the returned payload
 * against the tool's output schema afterwards.
 *
 * The regression this locks down: the route previously forwarded any payload
 * and returned 200 regardless, so a value violating a declared enum reached
 * the extension unreported and the sandbox showed a clean run for something
 * the platform would reject.
 */

/** Payloads the stub extension returns, selected per test. */
let stubResponse: unknown = { payload: { 'quality-result': { recommendations: [] } } };
/** Requests the stub extension received, so we can assert it was not called. */
let receivedRequests: unknown[] = [];

let extensionServer: Server;
let sandboxServer: Server;
let extensionUrl = '';
let sandboxUrl = '';

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function urlFor(server: Server): string {
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

beforeAll(async () => {
  const extensionApp = express();
  extensionApp.use(express.json());
  extensionApp.post('/v1/process', (req, res) => {
    receivedRequests.push(req.body);
    res.json(stubResponse);
  });
  extensionServer = await listen(extensionApp);
  extensionUrl = `${urlFor(extensionServer)}/v1/process`;

  const sandboxApp = express();
  sandboxApp.use(express.json());
  sandboxApp.use('/api/manifest', manifestRouter);
  sandboxServer = await listen(sandboxApp);
  sandboxUrl = urlFor(sandboxServer);
});

afterAll(async () => {
  // fetch keeps connections alive, so close() alone would never resolve.
  extensionServer.closeAllConnections();
  sandboxServer.closeAllConnections();
  await Promise.all([
    new Promise((resolve) => extensionServer.close(resolve)),
    new Promise((resolve) => sandboxServer.close(resolve)),
  ]);
});

/**
 * Manifest whose tool declares a `patientInformation` input. That schema has a
 * `biologicalSex` enum, which gives us a field that is structurally valid JSON
 * but violates the contract.
 */
function loadTestManifest(): void {
  const manifest: ExtensionManifest = {
    name: 'test-extension',
    description: 'Extension for execute-route tests',
    version: '1.0.0',
    radiologistsExtensibilityApiVersion: '0.1.0',
    auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
    tools: [
      {
        name: 'chest-ct-quality',
        toolType: 'contractBased',
        capability: 'qualityCheck',
        description: 'Quality check for chest CT reports',
        endpoint: extensionUrl,
        inputs: [
          {
            name: 'patientInformation',
            description: 'Patient information',
            'content-type': 'application/vnd.ms-dragon.rad.patient-information+json',
            schemaVersion: '0.1',
          },
        ],
        outputs: [
          {
            name: 'quality-result',
            description: 'Quality check findings',
            'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json',
            schemaVersion: '0.1',
          },
        ],
      },
    ],
  };
  sessionStore.setManifest(manifest);
}

function execute(inputs: Record<string, string>): Promise<Response> {
  return fetch(`${sandboxUrl}/api/manifest/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capability: 'qualityCheck', tool: 'chest-ct-quality', inputs }),
  });
}

describe('POST /api/manifest/execute – input validation', () => {
  beforeEach(() => {
    sessionStore.clear();
    receivedRequests = [];
    stubResponse = { payload: { 'quality-result': { recommendations: [] } } };
    loadTestManifest();
  });

  it('rejects an input that violates a declared enum and does not call the extension', async () => {
    const res = await execute({ 'patientInformation.biologicalSex': 'Martian' });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.inputValidation.some((r: { valid: boolean }) => !r.valid)).toBe(true);
    expect(receivedRequests).toHaveLength(0);
  });

  it('reports the offending field so the caller can fix it', async () => {
    const res = await execute({ 'patientInformation.biologicalSex': 'Martian' });
    const body = await res.json();

    const failed = body.inputValidation.find((r: { valid: boolean }) => !r.valid);
    expect(failed.inputName).toBe('patientInformation');

    const failedChecks = failed.checks.filter((c: { passed: boolean }) => !c.passed);
    const located = failedChecks
      .map((c: { path?: string; check: string }) => `${c.path ?? ''} ${c.check}`)
      .join(' ');
    expect(located).toContain('biologicalSex');
    expect(
      failedChecks.map((c: { error?: string }) => c.error).join(' '),
    ).toContain('Martian');
  });

  it('calls the extension when the inputs satisfy the schema', async () => {
    const res = await execute({ 'patientInformation.biologicalSex': 'Female' });

    expect(res.status).toBe(200);
    expect(receivedRequests).toHaveLength(1);
  });
});

describe('POST /api/manifest/execute – response validation', () => {
  beforeEach(() => {
    sessionStore.clear();
    receivedRequests = [];
    loadTestManifest();
  });

  it('returns a passing validation result for a conforming response', async () => {
    stubResponse = { payload: { 'quality-result': { recommendations: [] } } };

    const res = await execute({ 'patientInformation.biologicalSex': 'Female' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.validation.valid).toBe(true);
  });

  it('flags a response missing a required field instead of returning it unchecked', async () => {
    stubResponse = { payload: { 'quality-result': {} } };

    const res = await execute({ 'patientInformation.biologicalSex': 'Female' });
    const body = await res.json();

    // The call itself succeeded, so the status stays 200 – the contract
    // failure is reported in the validation result rather than as an error.
    expect(res.status).toBe(200);
    expect(body.validation.valid).toBe(false);
    expect(body.validation.checks.some((c: { passed: boolean }) => !c.passed)).toBe(true);
  });

  it('stores the validation result in the session for the Results tab', async () => {
    await execute({ 'patientInformation.biologicalSex': 'Female' });

    const stored = sessionStore.getValidationResults();
    expect(stored).toHaveLength(1);
    expect(stored[0].toolName).toBe('chest-ct-quality');
  });
});
