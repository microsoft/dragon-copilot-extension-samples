import fs from 'fs-extra';
import path from 'path';
import { logMessage } from './logging.js';

const SAMPLE_LOGO_BYTES = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
];

export interface AssetBootstrapOptions {
  assetsDirName?: string;
  silent?: boolean;
  overwrite?: boolean;
}

export interface AssetBootstrapResult {
  assetsDir: string;
  logoPath: string;
  copied: boolean;
}

export async function bootstrapAssetsDirectory(
  baseDir: string,
  options?: AssetBootstrapOptions
): Promise<AssetBootstrapResult> {
  const assetsDirName = options?.assetsDirName ?? 'assets';
  const silent = options?.silent ?? false;
  const overwrite = options?.overwrite ?? true;

  const assetsDir = path.join(baseDir, assetsDirName);
  await fs.ensureDir(assetsDir);

  const targetLogoPath = path.join(assetsDir, 'logo_large.png');
  const shouldWrite = overwrite || !(await fs.pathExists(targetLogoPath));

  if (shouldWrite) {
    await fs.writeFile(targetLogoPath, Buffer.from(SAMPLE_LOGO_BYTES));
    logMessage(`✅ Sample logo copied to ${assetsDirName}/logo_large.png`, silent);
    logMessage('⚠️  Remember to replace this with your own logo before packaging!', silent);
    return { assetsDir, logoPath: targetLogoPath, copied: true };
  }

  logMessage(`ℹ️  Existing logo preserved at ${assetsDirName}/logo_large.png`, silent);
  return { assetsDir, logoPath: targetLogoPath, copied: false };
}
