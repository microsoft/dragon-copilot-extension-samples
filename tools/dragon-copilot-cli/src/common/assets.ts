import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { logMessage } from './logging.js';

function getCurrentDir(): string {
  if (typeof __dirname === 'string' && __dirname.length > 0) {
    return __dirname;
  }

  try {
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string' && import.meta.url.length > 0) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Ignore and fall back below
  }

  return process.cwd();
}

const currentDir = getCurrentDir();

function getResourceLogoPath(): string {
  return path.resolve(currentDir, '..', 'resources', 'assets', 'logo_large.png');
}

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
    const sourceLogoPath = getResourceLogoPath();
    await fs.copy(sourceLogoPath, targetLogoPath);
    logMessage(`✅ Sample logo copied to ${assetsDirName}/logo_large.png`, silent);
    logMessage('⚠️  Remember to replace this with your own logo before packaging!', silent);
    return { assetsDir, logoPath: targetLogoPath, copied: true };
  }

  logMessage(`ℹ️  Existing logo preserved at ${assetsDirName}/logo_large.png`, silent);
  return { assetsDir, logoPath: targetLogoPath, copied: false };
}
