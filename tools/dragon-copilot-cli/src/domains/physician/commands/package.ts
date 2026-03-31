import fs from 'fs-extra';
const { readFileSync, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { logMessage } from '../../../common/index.js';
import type { PackageOptions, DragonExtensionManifest } from '../types.js';
import { validateExtensionManifest } from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function packageExtension(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';

  logMessage(chalk.blue('🐉 Packaging Dragon Copilot Physician Workflow'), isQuiet);

  const manifestPath = options.manifest || 'extension.yaml';

  // Step 1: Validate required files exist
  logMessage(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
  logMessage(chalk.red(`❌ Extension manifest not found: ${manifestPath}`), isQuiet);
  logMessage(chalk.gray('   Create one using: dragon-copilot physician init'), isQuiet);
    throw new Error(`Extension manifest not found: ${manifestPath}`);
  }

  logMessage(chalk.gray(`✓ Found extension manifest: ${manifestPath}`), isQuiet);

  try {
    // Step 2: Validate extension manifest
  logMessage(chalk.blue('\n📋 Validating physician workflow manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as DragonExtensionManifest;

    const manifestValidation = validateExtensionManifest(manifest);
    if (!manifestValidation.isValid) {
  logMessage(chalk.red('❌ Physician workflow manifest validation failed:'), isQuiet);
      manifestValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
  logMessage(chalk.red(`  • ${fieldName}: ${error.message}`), isQuiet);
      });
      throw new Error('Extension manifest validation failed');
    }
  logMessage(chalk.green('✅ Physician workflow manifest is valid'), isQuiet);

    // Step 3: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

  logMessage(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
  logMessage(chalk.gray(`📄 Extension: ${manifest.name} v${manifest.version}`), isQuiet);
  logMessage(chalk.gray(`🛠️  Tools: ${manifest.tools?.length || 0}`), isQuiet);

    // Create ZIP archive
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive events
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
  logMessage(chalk.green(`\n✅ Package created successfully!`), isQuiet);
  logMessage(chalk.gray(`📁 File: ${outputPath}`), isQuiet);
  logMessage(chalk.gray(`📏 Size: ${sizeKB} KB`), isQuiet);

      // Package summary
  logMessage(chalk.blue('\n📊 Package Contents:'), isQuiet);
  logMessage(chalk.gray(`  • Physician workflow manifest (extension.yaml)`), isQuiet);
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

    // Add required files with standardized names
    // Always name the manifest "extension.yaml" in the package, regardless of source filename
    archive.file(manifestPath, { name: 'extension.yaml' });
  logMessage(chalk.gray(`✓ Added extension.yaml (from ${path.basename(manifestPath)})`), isQuiet);

    // Add additional files if specified
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

    // Add locales directory if it exists
    if (await pathExists('locales')) {
      archive.directory('locales', 'locales');
  logMessage(chalk.gray(`✓ Added locales/ directory (localization files)`), isQuiet);
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    if (error instanceof Error) {
      logMessage(chalk.red(`❌ Failed to package extension: ${error.message}`), isQuiet);
      throw error; // Re-throw for test handling
    } else {
      logMessage(chalk.red('❌ Failed to package extension: Unknown error'), isQuiet);
      throw new Error('Failed to package extension: Unknown error');
    }
  }
}
