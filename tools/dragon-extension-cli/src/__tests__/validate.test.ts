import { validateManifest } from '../commands/validate.js';
import fs from 'fs-extra';
import path from 'path';

const { writeFileSync, removeSync } = fs;

const testManifestPath = path.join(__dirname, 'test-manifest.yaml');

describe('validateManifest', () => {
  afterEach(() => {
    try {
      removeSync(testManifestPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should validate a correct manifest', async () => {
    const validManifest = `
name: test-extension
description: A test extension
version: 1.0.0
tools:
  - name: test-tool
    description: A test tool
    endpoint: https://api.example.com/v1/test
    inputs:
      - name: note
        description: Clinical note
        data: DSP/Note
    outputs:
      - name: result
        description: Processed result
        data: DSP
`;

    writeFileSync(testManifestPath, validManifest);

    // This should not throw
    await expect(validateManifest(testManifestPath)).resolves.toBeUndefined();
  });

  test('should detect missing required fields', async () => {
    const invalidManifest = `
description: A test extension
version: 1.0.0
tools: []
`;

    writeFileSync(testManifestPath, invalidManifest);

    // Mock process.exit to prevent actual exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    await expect(validateManifest(testManifestPath)).rejects.toThrow('Process exit called');

    mockExit.mockRestore();
  });

  test('should detect invalid version format', async () => {
    const invalidManifest = `
name: test-extension
description: A test extension
version: 1.0
tools: []
`;

    writeFileSync(testManifestPath, invalidManifest);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });

    await expect(validateManifest(testManifestPath)).rejects.toThrow('Process exit called');

    mockExit.mockRestore();
  });
});
