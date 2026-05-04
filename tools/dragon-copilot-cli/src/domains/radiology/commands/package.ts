import fs from 'fs-extra';
const { readFileSync, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { logMessage } from '../../../common/index.js';
import type { PackageOptions, DcrExtensionManifest } from '../types.js';
import { validateExtensionManifest } from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function packageExtension(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';

    logMessage(chalk.blue('🐉 Packaging Dragon Copilot Radiology Extension'), isQuiet);

  const manifestPath = options.manifest || 'extension.yaml';

    logMessage(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
      logMessage(chalk.red(`❌ Extension manifest not found: ${manifestPath}`), isQuiet);
    logMessage(chalk.gray('   Create one using: dragon-copilot radiology init'), isQuiet);
    throw new Error(`Extension manifest not found: ${manifestPath}`);
  }

    logMessage(chalk.gray(`✓ Found extension manifest: ${manifestPath}`), isQuiet);

  try {
      logMessage(chalk.blue('\n📋 Validating radiology extension manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as DcrExtensionManifest;

    const manifestValidation = validateExtensionManifest(manifest);
    if (!manifestValidation.isValid) {
        logMessage(chalk.red('❌ Radiology extension manifest validation failed:'), isQuiet);
      manifestValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
        logMessage(chalk.red(`  • ${fieldName}: ${error.message}`), isQuiet);
      });
      throw new Error('Extension manifest validation failed');
    }
      logMessage(chalk.green('✅ Radiology extension manifest is valid'), isQuiet);

    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

      logMessage(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
      logMessage(chalk.gray(`📄 Extension: ${manifest.name} v${manifest.version}`), isQuiet);
      logMessage(chalk.gray(`🛠️  Tools: ${manifest.tools?.length || 0}`), isQuiet);

    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
        logMessage(chalk.green(`\n✅ Package created successfully!`), isQuiet);
        logMessage(chalk.gray(`📁 File: ${outputPath}`), isQuiet);
        logMessage(chalk.gray(`📏 Size: ${sizeKB} KB`), isQuiet);

        logMessage(chalk.blue('\n📊 Package Contents:'), isQuiet);
      logMessage(chalk.gray(`  • Radiology extension manifest (extension.yaml)`), isQuiet);
      if (options.include && options.include.length > 0) {
        logMessage(chalk.gray(`  • Additional files: ${options.include.length}`), isQuiet);
      }

        logMessage(chalk.green('\n🎉 Ready for deployment!'), isQuiet);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
          logMessage(chalk.yellow(`⚠️  Warning: ${err.message}`), isQuiet);
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
        logMessage(chalk.red(`❌ Archive error: ${err.message}`), isQuiet);
      throw new Error(`Archive error: ${err.message}`);
    });

    archive.pipe(output);

    archive.file(manifestPath, { name: 'extension.yaml' });
      logMessage(chalk.gray(`✓ Added extension.yaml (from ${path.basename(manifestPath)})`), isQuiet);

    if (options.include && options.include.length > 0) {
        logMessage(chalk.blue('\n📁 Adding additional files...'), isQuiet);
      for (const pattern of options.include) {
        if (await pathExists(pattern)) {
          const fileName = path.basename(pattern);
          archive.file(pattern, { name: fileName });
            logMessage(chalk.gray(`✓ Added ${fileName}`), isQuiet);
        } else {
            logMessage(chalk.yellow(`⚠️  File not found, skipping: ${pattern}`), isQuiet);
        }
      }
    }

    if (await pathExists('locales')) {
      archive.directory('locales', 'locales');
        logMessage(chalk.gray(`✓ Added locales/ directory (localization files)`), isQuiet);
    }

    await archive.finalize();

  } catch (error) {
    if (error instanceof Error) {
        logMessage(chalk.red(`❌ Failed to package extension: ${error.message}`), isQuiet);
      throw error;
    } else {
        logMessage(chalk.red('❌ Failed to package extension: Unknown error'), isQuiet);
      throw new Error('Failed to package extension: Unknown error');
    }
  }
}
