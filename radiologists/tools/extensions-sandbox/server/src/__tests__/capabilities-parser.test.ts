import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '../store/session.js';
import { parseCapabilities } from '../utils/capabilities-parser.js';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';

/**
 * Unit tests for the capabilities parsing logic.
 * Tests the grouping algorithm that powers GET /api/manifest/capabilities.
 */


const baseTool = {
  toolType: 'contractBased' as const,
  endpoint: 'https://api.example.com/v1/process',
  inputs: [
    {
      name: 'report',
      description: 'Report',
      'content-type': 'application/vnd.ms-dragon.rad.report+json' as const,
      schemaVersion: '0.1',
    },
  ],
  outputs: [
    {
      name: 'result',
      description: 'Result',
      'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json' as const,
      schemaVersion: '0.1',
    },
  ],
};

describe('Capabilities Parser', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('should group tools by capability and return correct tool counts', () => {
    const manifest = {
      name: 'test-extension',
      description: 'Test',
      version: '0.0.1',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'tool-1', capability: 'reportGeneration', description: 'Generates report' },
        { ...baseTool, name: 'tool-2', capability: 'qualityCheck', description: 'Clinical quality' },
        { ...baseTool, name: 'tool-3', capability: 'qualityCheck', description: 'Billing quality' },
      ],
    } as unknown as ExtensionManifest;

    const capabilities = parseCapabilities(manifest);

    expect(capabilities).toHaveLength(2);
    expect(capabilities).toEqual([
      { name: 'reportGeneration', description: 'Report Generation capability', toolCount: 1 },
      { name: 'qualityCheck', description: 'Quality Check capability', toolCount: 2 },
    ]);
  });

  it('should return empty array for manifest with no tools', () => {
    const manifest: ExtensionManifest = {
      name: 'empty-extension',
      description: 'No tools',
      version: '0.0.1',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [],
    };

    const capabilities = parseCapabilities(manifest);
    expect(capabilities).toEqual([]);
  });

  it('should handle a single tool with one capability', () => {
    const manifest = {
      name: 'single-tool',
      description: 'One tool only',
      version: '1.0.0',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'only-tool', capability: 'reportGeneration', description: 'The only tool' },
      ],
    } as unknown as ExtensionManifest;

    const capabilities = parseCapabilities(manifest);

    expect(capabilities).toHaveLength(1);
    expect(capabilities[0]).toEqual({
      name: 'reportGeneration',
      description: 'Report Generation capability',
      toolCount: 1,
    });
  });

  it('should store and retrieve manifest from session store', () => {
    const manifest: ExtensionManifest = {
      name: 'session-test',
      description: 'Session test',
      version: '0.0.1',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'tool-a', capability: 'qualityCheck', description: 'Quality A' },
      ],
    };

    expect(sessionStore.getManifest()).toBeNull();
    sessionStore.setManifest(manifest);
    expect(sessionStore.getManifest()).toEqual(manifest);
  });

  it('should handle snake_case capability names', () => {
    const manifest = {
      name: 'snake-case-test',
      description: 'Test',
      version: '0.0.1',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'tool-1', capability: 'quality_check', description: 'Quality check' },
      ],
    } as unknown as ExtensionManifest;

    const capabilities = parseCapabilities(manifest);
    expect(capabilities[0].description).toBe('Quality Check capability');
  });

  it('should handle kebab-case capability names', () => {
    const manifest = {
      name: 'kebab-case-test',
      description: 'Test',
      version: '0.0.1',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'tool-1', capability: 'report-generation', description: 'Report' },
      ],
    } as unknown as ExtensionManifest;

    const capabilities = parseCapabilities(manifest);
    expect(capabilities[0].description).toBe('Report Generation capability');
  });

  it('should handle ALLCAPS capability names', () => {
    const manifest = {
      name: 'allcaps-test',
      description: 'Test',
      version: '0.0.1',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'tool-1', capability: 'ALLCAPS', description: 'All caps' },
      ],
    } as unknown as ExtensionManifest;

    const capabilities = parseCapabilities(manifest);
    expect(capabilities[0].description).toBe('ALLCAPS capability');
  });
});
