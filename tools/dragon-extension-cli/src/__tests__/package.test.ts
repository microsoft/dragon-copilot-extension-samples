import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { packageExtension } from '../commands/package.js';

describe('Package Command', () => {
  const testDir = 'test-package-temp';
  const manifestPath = path.join(testDir, 'extension.yaml');
  const publisherPath = path.join(testDir, 'publisher.json');

  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);

    // Create valid manifest
    const manifest = `name: test-package-extension
description: Test extension for package command
version: 1.0.0
tools:
  - name: test-tool
    description: A test tool
    endpoint: https://api.example.com/test
    inputs:
      - name: note
        description: Clinical note
        data: DSP/Note
    outputs:
      - name: result
        description: Result
        data: DSP`;

    await fs.writeFile(manifestPath, manifest);

    // Create valid publisher config
    const publisher = {
      publisherId: 'test.publisher',
      publisherName: 'Test Publisher Inc.',
      websiteUrl: 'https://www.testpublisher.com',
      privacyPolicyUrl: 'https://www.testpublisher.com/privacy',
      supportUrl: 'https://www.testpublisher.com/support',
      version: '1.0.0',
      contactEmail: 'support@testpublisher.com',
      offerId: 'test-offer',
      defaultLocale: 'en-US',
      supportedLocales: ['en-US'],
      countries: ['US']
    };

    await fs.writeFile(publisherPath, JSON.stringify(publisher, null, 2));

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Change back and clean up
    process.chdir('..');
    await fs.remove(testDir);
  });

  test('should successfully package valid extension with publisher config', async () => {
    const packagePath = 'test-package-extension-1.0.0.zip';

    await packageExtension({
      manifest: 'extension.yaml',
      output: packagePath
    });

    // Check that package was created
    expect(await fs.pathExists(packagePath)).toBe(true);

    // Clean up
    await fs.remove(packagePath);
  });

  test('should fail when publisher.json is missing', async () => {
    await fs.remove('publisher.json');

    await expect(packageExtension({
      manifest: 'extension.yaml'
    })).rejects.toThrow();
  });

  test('should fail when extension manifest is missing', async () => {
    await fs.remove('extension.yaml');

    await expect(packageExtension({
      manifest: 'extension.yaml'
    })).rejects.toThrow();
  });
});
