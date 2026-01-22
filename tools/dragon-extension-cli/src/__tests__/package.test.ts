import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { packageExtension } from '../commands/package.js';

describe('Package Command', () => {
  const testDir = 'test-package-temp';
  const manifestPath = path.join(testDir, 'extension.yaml');
  const publisherPath = path.join(testDir, 'publisher.json');
  const logoPath = path.join(testDir, 'assets', 'logo_large.png');

  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);

    // Create valid manifest
    const manifest = `name: test-package-extension
description: Test extension for package command
version: 1.0.0
auth:
  tenantId: 12345678-1234-1234-1234-123456789abc
tools:
  - name: test-tool
    description: A test tool
    endpoint: https://api.example.com/test
    inputs:
      - name: note
        description: Clinical note
        content-type: application/vnd.ms-dragon.dsp.note+json
    outputs:
      - name: result
        description: Result
        content-type: application/vnd.ms-dragon.dsp+json`;

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
      scope: 'Workflow',
      regions: ['US']
    };

    await fs.writeFile(publisherPath, JSON.stringify(publisher, null, 2));

    // Create assets directory and sample logo
    await fs.ensureDir(path.join(testDir, 'assets'));
    // Create a minimal PNG file (1x1 pixel transparent PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // bit depth, color type, etc.
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk start
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, // compressed data
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // compressed data end
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
      0x42, 0x60, 0x82
    ]);
    await fs.writeFile(logoPath, pngBuffer);

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
      output: packagePath,
      silent: true
    });

    // Check that package was created
    expect(await fs.pathExists(packagePath)).toBe(true);

    // Clean up
    await fs.remove(packagePath);
  });

  test('should fail when publisher.json is missing', async () => {
    await fs.remove('publisher.json');

    await expect(packageExtension({
      manifest: 'extension.yaml',
      silent: true
    })).rejects.toThrow();
  });

  test('should fail when extension manifest is missing', async () => {
    await fs.remove('extension.yaml');

    await expect(packageExtension({
      manifest: 'extension.yaml',
      silent: true
    })).rejects.toThrow();
  });

  test('should fail when logo is missing', async () => {
    await fs.remove('assets/logo_large.png');

    await expect(packageExtension({
      manifest: 'extension.yaml',
      silent: true
    })).rejects.toThrow('Required logo not found: assets/logo_large.png');
  });

  test('should fail when logo is not a valid PNG', async () => {
    // Write invalid PNG file
    await fs.writeFile('assets/logo_large.png', 'not a png file');

    await expect(packageExtension({
      manifest: 'extension.yaml',
      silent: true
    })).rejects.toThrow();
  });
});
