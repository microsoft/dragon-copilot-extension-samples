import { DragonExtensionManifest, DragonTool } from '../types.js';

describe('Types', () => {
  test('should define DragonExtensionManifest interface correctly', () => {
    const manifest: DragonExtensionManifest = {
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0',
      tools: []
    };

    expect(manifest.name).toBe('test-extension');
    expect(manifest.description).toBe('A test extension');
    expect(manifest.version).toBe('1.0.0');
    expect(Array.isArray(manifest.tools)).toBe(true);
  });

  test('should define DragonTool interface correctly', () => {
    const tool: DragonTool = {
      name: 'test-tool',
      description: 'A test tool',
      endpoint: 'https://api.example.com/v1/test',
      inputs: [{
        name: 'input1',
        description: 'Test input',
        data: 'DSP/Note'
      }],
      outputs: [{
        name: 'output1',
        description: 'Test output',
        data: 'DSP'
      }]
    };

    expect(tool.name).toBe('test-tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.endpoint).toBe('https://api.example.com/v1/test');
    expect(tool.inputs).toHaveLength(1);
    expect(tool.outputs).toHaveLength(1);
  });
});
