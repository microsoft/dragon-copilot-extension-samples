import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { manifestRouter } from '../routes/manifest.js';
import { sessionStore } from '../store/session.js';

/**
 * Regression test for a manifest that mixes tool types. A partnerInitiated tool declares no endpoint
 * or inputs, and reading its missing `inputs` used to make its capability's tool list return 500.
 */

// server/src/__tests__ -> radiologists/manifest/extension.yaml, which declares one tool of each type.
const MIXED_MANIFEST_PATH = resolve(__dirname, '..', '..', '..', '..', '..', 'manifest', 'extension.yaml');

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/manifest', manifestRouter);
  server = await new Promise<Server>((resolveServer) => {
    const listening = app.listen(0, '127.0.0.1', () => resolveServer(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  sessionStore.clear();
  const response = await fetch(`${baseUrl}/api/manifest/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: readFileSync(MIXED_MANIFEST_PATH, 'utf-8') }),
  });
  expect(response.status).toBe(200);
});

afterAll(async () => {
  sessionStore.clear();
  // fetch keeps connections alive, so close() alone would never resolve.
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
});

describe('a manifest with a contractBased and a partnerInitiated tool', () => {
  it('lists both capabilities', async () => {
    const response = await fetch(`${baseUrl}/api/manifest/capabilities`);

    expect(response.status).toBe(200);
    expect((await response.json()).map((capability: { name: string; toolCount: number }) => [capability.name, capability.toolCount]))
      .toEqual([['qualityCheck', 1], ['preDraftReportGeneration', 1]]);
  });

  it('lists the partnerInitiated tool without an endpoint or inputs', async () => {
    const response = await fetch(`${baseUrl}/api/manifest/capabilities/preDraftReportGeneration/tools`);

    expect(response.status).toBe(200);
    const [tool, ...others] = await response.json();
    expect(others).toEqual([]);
    expect(tool).toMatchObject({ name: 'preDraftReportGeneratorTool', toolType: 'partnerInitiated', inputs: [] });
    expect(tool.endpoint).toBeUndefined();
  });

  it('still lists the contractBased tool with its endpoint and inputs', async () => {
    const response = await fetch(`${baseUrl}/api/manifest/capabilities/qualityCheck/tools`);

    expect(response.status).toBe(200);
    const [tool] = await response.json();
    expect(tool).toMatchObject({
      name: 'sampleQualityCheckTool',
      toolType: 'contractBased',
      endpoint: 'https://publisher.example.com/quality-check',
    });
    expect(tool.inputs.map((input: { name: string }) => input.name)).toEqual(['report', 'patientInformation']);
  });

  it('rejects executing the partnerInitiated tool', async () => {
    const response = await fetch(`${baseUrl}/api/manifest/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'preDraftReportGeneration', tool: 'preDraftReportGeneratorTool', inputs: {} }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('so it cannot use the execute endpoint');
  });
});
