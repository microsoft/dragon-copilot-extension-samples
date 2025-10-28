import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bootstrapAssetsDirectory } from '@dragon-copilot/cli-common';

describe('bootstrapAssetsDirectory', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-common-assets-'));
  });

  afterEach(async () => {
    await fs.remove(tempRoot);
  });

  it('creates the default assets directory and sample logo when missing', async () => {
    const result = await bootstrapAssetsDirectory(tempRoot, { silent: true });

    const expectedAssetsDir = path.join(tempRoot, 'assets');
    const expectedLogoPath = path.join(expectedAssetsDir, 'logo_large.png');

    expect(result.assetsDir).toBe(expectedAssetsDir);
    expect(result.logoPath).toBe(expectedLogoPath);
    expect(result.copied).toBe(true);
    expect(await fs.pathExists(expectedAssetsDir)).toBe(true);

    const logoStats = await fs.stat(expectedLogoPath);
    expect(logoStats.size).toBeGreaterThan(0);
  });

  it('preserves an existing logo when overwrite is disabled', async () => {
    const assetsDir = path.join(tempRoot, 'assets');
    const logoPath = path.join(assetsDir, 'logo_large.png');

    await fs.ensureDir(assetsDir);
    await fs.writeFile(logoPath, 'original');

    const result = await bootstrapAssetsDirectory(tempRoot, { silent: true, overwrite: false });

    expect(result.copied).toBe(false);
    expect(await fs.readFile(logoPath, 'utf8')).toBe('original');
  });

  it('honors a custom assets directory name', async () => {
    const customDir = 'branding';
    const result = await bootstrapAssetsDirectory(tempRoot, {
      assetsDirName: customDir,
      silent: true
    });

    const expectedAssetsDir = path.join(tempRoot, customDir);
    const expectedLogoPath = path.join(expectedAssetsDir, 'logo_large.png');

    expect(result.assetsDir).toBe(expectedAssetsDir);
    expect(result.logoPath).toBe(expectedLogoPath);
    expect(await fs.pathExists(expectedLogoPath)).toBe(true);
  });
});
