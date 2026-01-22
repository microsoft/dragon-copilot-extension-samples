import { validateManifest } from '../commands/validate.js';
import fs from 'fs-extra';
import path from 'path';

const { writeFileSync, removeSync } = fs;

const testManifestPath = path.join(__dirname, 'test-extension.yaml');

// Mock console.log to prevent output during tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('validateManifest', () => {
  afterEach(() => {
    try {
      removeSync(testManifestPath);
    } catch {
      // Ignore cleanup errors
    }
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  test('should validate a correct manifest', async () => {
    const validManifest = `
name: test-extension
description: A test extension
version: 1.0.0
auth:
  tenantId: 12345678-1234-1234-1234-123456789abc
tools:
  - name: test-tool
    description: A test tool
    endpoint: https://api.example.com/v1/test
    inputs:
      - name: note
        description: Clinical note
        content-type: application/vnd.ms-dragon.dsp.note+json
    outputs:
      - name: result
        description: Processed result
        content-type: application/vnd.ms-dragon.dsp+json
`;

    writeFileSync(testManifestPath, validManifest);

    // This should not throw
    await expect(validateManifest(testManifestPath)).resolves.toBeUndefined();

    // Verify console.log was called with success message
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ Validation passed!'));

    // Verify auth information is included in summary
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Auth Tenant ID: 12345678-1234-1234-1234-123456789abc'));
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
auth:
  tenantId: 12345678-1234-1234-1234-123456789abc
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
