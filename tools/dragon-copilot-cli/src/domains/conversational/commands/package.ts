import fs from 'fs-extra';
const { readFileSync, createWriteStream, pathExists } = fs;
import { load } from 'js-yaml';
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { logMessage } from '../../../common/index.js';
import type { PackageOptions, ConversationalManifest } from '../types.js';
import { validateConversationalManifest, formatErrors } from '../shared/schema-validator.js';

/**
 * Validates the manifest and zips it (plus optional files) for upload through the
 * Dragon admin center (sideload) or for marketplace submission.
 */
export async function packageExtension(options: PackageOptions): Promise<string> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';
  const manifestPath = options.manifest || 'extension.yaml';

  logMessage(chalk.blue('🐉 Packaging Dragon Copilot Conversational Extension'), isQuiet);

  if (!(await pathExists(manifestPath))) {
    logMessage(chalk.gray('   Create one using: dragon-copilot conversational init'), isQuiet);
    throw new Error(`Extension manifest not found: ${manifestPath}`);
  }

  const manifest = load(readFileSync(manifestPath, 'utf8')) as ConversationalManifest;
  const result = validateConversationalManifest(manifest);
  result.warnings.forEach(warning => logMessage(chalk.yellow(`⚠️  ${warning}`), isQuiet));
  if (!result.isValid) {
    formatErrors(result.errors).forEach(line => logMessage(chalk.red(`  • ${line}`), isQuiet));
    throw new Error('Extension manifest validation failed');
  }
  logMessage(chalk.green('✅ Manifest is valid'), isQuiet);

  const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = createWriteStream(outputPath);

  const done = new Promise<void>((resolvePromise, reject) => {
    output.on('close', () => resolvePromise());
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);
  archive.file(manifestPath, { name: 'extension.yaml' });

  for (const file of options.include ?? []) {
    if (await pathExists(file)) {
      archive.file(file, { name: path.basename(file) });
      logMessage(chalk.gray(`✓ Added ${path.basename(file)}`), isQuiet);
    } else {
      logMessage(chalk.yellow(`⚠️  File not found, skipping: ${file}`), isQuiet);
    }
  }

  await archive.finalize();
  await done;

  logMessage(chalk.green(`📦 Package created: ${outputPath} (${(archive.pointer() / 1024).toFixed(2)} KB)`), isQuiet);
  return outputPath;
}
