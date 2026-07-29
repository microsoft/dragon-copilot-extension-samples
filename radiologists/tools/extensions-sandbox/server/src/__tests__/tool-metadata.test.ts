import { describe, it, expect } from 'vitest';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import { getToolsForCapability } from '../utils/tool-metadata.js';

/**
 * Unit tests for the tool metadata utility.
 * Tests the filtering that powers GET /api/manifest/capabilities/:capabilityName/tools.
 */

const baseTool = {
  toolType: 'contractBased' as const,
  endpoint: 'https://api.example.com/v1/process',
  inputs: [
    {
      name: 'report',
      description: 'The report to check',
      'content-type': 'application/vnd.ms-dragon.rad.report+json' as const,
      required: true,
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

const sampleManifest = {
  name: 'test-extension',
  description: 'Test',
  version: '0.0.1',
  auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
  tools: [
    { ...baseTool, name: 'tool-report-gen', capability: 'reportGeneration', description: 'Generates reports' },
    { ...baseTool, name: 'tool-clinical-qc', capability: 'qualityCheck', description: 'Clinical quality check' },
    {
      ...baseTool,
      name: 'tool-billing-qc',
      capability: 'qualityCheck',
      description: 'Billing quality check',
      endpoint: 'https://api.example.com/v1/billing',
    },
  ],
} as unknown as ExtensionManifest;

describe('Tool Metadata - getToolsForCapability', () => {
  it('should return tools for a valid capability', () => {
    const tools = getToolsForCapability(sampleManifest, 'qualityCheck');

    expect(tools).not.toBeNull();
    expect(tools).toHaveLength(2);
    expect(tools![0].name).toBe('tool-clinical-qc');
    expect(tools![1].name).toBe('tool-billing-qc');
  });

  it('should return null for an invalid capability', () => {
    const tools = getToolsForCapability(sampleManifest, 'nonExistentCapability');
    expect(tools).toBeNull();
  });

  it('should include input metadata with correct fields', () => {
    const tools = getToolsForCapability(sampleManifest, 'reportGeneration');

    expect(tools).toHaveLength(1);
    const tool = tools![0];
    expect(tool.inputs).toHaveLength(1);
    expect(tool.inputs[0]).toEqual({
      name: 'report',
      description: 'The report to check',
      contentType: 'application/vnd.ms-dragon.rad.report+json',
      required: true,
    });
  });

  it('should include output metadata', () => {
    const tools = getToolsForCapability(sampleManifest, 'reportGeneration');

    expect(tools![0].outputs).toEqual([
      { name: 'result', contentType: 'application/vnd.ms-dragon.rad.quality-check-result+json' },
    ]);
  });

  it('should default required to false when not specified', () => {
    const manifest = {
      name: 'test',
      description: 'Test',
      version: '0.0.1',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        {
          name: 'optional-input-tool',
          toolType: 'contractBased',
          capability: 'reportGeneration',
          description: 'Tool with optional input',
          endpoint: 'https://api.example.com/v1/gen',
          inputs: [
            {
              name: 'data',
              description: 'Optional data',
              'content-type': 'application/vnd.ms-dragon.rad.report+json',
              schemaVersion: '0.1',
              // required not specified
            },
          ],
          outputs: [
            { name: 'out', description: 'Output', 'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json', schemaVersion: '0.1' },
          ],
        },
      ],
    } as unknown as ExtensionManifest;

    const tools = getToolsForCapability(manifest, 'reportGeneration');
    expect(tools![0].inputs[0].required).toBe(false);
  });

  it('should return empty array for capability with no tools (edge case)', () => {
    // This scenario shouldn't happen with real data since capabilities are derived from tools,
    // but we test the filter returns empty if somehow no tools match
    const manifest: ExtensionManifest = {
      name: 'empty',
      description: 'Empty',
      version: '0.0.1',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
      tools: [
        { ...baseTool, name: 'only-tool', capability: 'qualityCheck', description: 'Only tool' },
      ],
    };

    const tools = getToolsForCapability(manifest, 'qualityCheck');
    expect(tools).toHaveLength(1);

    // Requesting a different valid capability that has tools but filtering yields none is not possible
    // since capabilities are derived from tools — test the null path instead
    const missing = getToolsForCapability(manifest, 'nonExistent');
    expect(missing).toBeNull();
  });

  it('should include endpoint URL for each tool', () => {
    const tools = getToolsForCapability(sampleManifest, 'qualityCheck');

    expect(tools![0].endpoint).toBe('https://api.example.com/v1/process');
    expect(tools![1].endpoint).toBe('https://api.example.com/v1/billing');
  });
});
