import fs from 'fs-extra';
const { readFileSync, createReadStream, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { PackageOptions, DragonExtensionManifest, PublisherConfig } from '../types.js';
import { validateExtensionManifest, validatePublisherConfig, SchemaError } from '../shared/schema-validator.js';

// Helper function for conditional logging
function log(message: string, silent: boolean = false): void {
  if (!silent && process.env.NODE_ENV !== 'test') {
    console.log(message);
  }
}

export async function packageExtension(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';
  
  log(chalk.blue('🐉 Packaging Dragon Copilot Extension'), isQuiet);

  const manifestPath = options.manifest || 'extension.yaml';
  const publisherPath = 'publisher.json';

  // Step 1: Validate required files exist
  log(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
    log(chalk.red(`❌ Extension manifest not found: ${manifestPath}`), isQuiet);
    log(chalk.gray('   Create one using: dragon-extension init'), isQuiet);
    throw new Error(`Extension manifest not found: ${manifestPath}`);
  }

  if (!(await pathExists(publisherPath))) {
    log(chalk.red(`❌ Publisher configuration not found: ${publisherPath}`), isQuiet);
    log(chalk.gray('   A publisher.json file is required for packaging'), isQuiet);
    log(chalk.gray('   Create one using: dragon-extension init --with-publisher'), isQuiet);
    throw new Error(`Publisher configuration not found: ${publisherPath}`);
  }

  log(chalk.gray(`✓ Found extension manifest: ${manifestPath}`), isQuiet);
  log(chalk.gray(`✓ Found publisher configuration: ${publisherPath}`), isQuiet);

  try {
    // Step 2: Validate extension manifest
    log(chalk.blue('\n📋 Validating extension manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as DragonExtensionManifest;

    const manifestValidation = validateExtensionManifest(manifest);
    if (!manifestValidation.isValid) {
      log(chalk.red('❌ Extension manifest validation failed:'), isQuiet);
      manifestValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
        log(chalk.red(`  • ${fieldName}: ${error.message}`), isQuiet);
      });
      throw new Error('Extension manifest validation failed');
    }
    log(chalk.green('✅ Extension manifest is valid'), isQuiet);

    // Step 3: Validate publisher configuration
    log(chalk.blue('📋 Validating publisher configuration...'), isQuiet);
    let publisherConfig: PublisherConfig;
    try {
      const publisherContent = readFileSync(publisherPath, 'utf8');
      publisherConfig = JSON.parse(publisherContent) as PublisherConfig;
    } catch (parseError) {
      log(chalk.red('❌ Failed to parse publisher.json:'), isQuiet);
      if (parseError instanceof Error) {
        log(chalk.red(`   ${parseError.message}`), isQuiet);
      }
      throw new Error('Failed to parse publisher.json');
    }

    const publisherValidation = validatePublisherConfig(publisherConfig);
    if (!publisherValidation.isValid) {
      log(chalk.red('❌ Publisher configuration validation failed:'), isQuiet);
      publisherValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'config';
        log(chalk.red(`  • ${fieldName}: ${error.message}`), isQuiet);
      });
      throw new Error('Publisher configuration validation failed');
    }
    log(chalk.green('✅ Publisher configuration is valid'), isQuiet);

    // Step 4: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

    log(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
    log(chalk.gray(`🏢 Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`), isQuiet);
    log(chalk.gray(`📄 Extension: ${manifest.name} v${manifest.version}`), isQuiet);
    log(chalk.gray(`🛠️  Tools: ${manifest.tools?.length || 0}`), isQuiet);

    // Create ZIP archive
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive events
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      log(chalk.green(`\n✅ Package created successfully!`), isQuiet);
      log(chalk.gray(`📁 File: ${outputPath}`), isQuiet);
      log(chalk.gray(`📏 Size: ${sizeKB} KB`), isQuiet);

      // Package summary
      log(chalk.blue('\n📊 Package Contents:'), isQuiet);
      log(chalk.gray(`  • Extension manifest (extension.yaml)`), isQuiet);
      log(chalk.gray(`  • Publisher configuration (publisher.json)`), isQuiet);
      if (options.include && options.include.length > 0) {
        log(chalk.gray(`  • Additional files: ${options.include.length}`), isQuiet);
      }

      log(chalk.green('\n🎉 Ready for deployment!'), isQuiet);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        log(chalk.yellow(`⚠️  Warning: ${err.message}`), isQuiet);
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      log(chalk.red(`❌ Archive error: ${err.message}`), isQuiet);
      throw new Error(`Archive error: ${err.message}`);
    });

    archive.pipe(output);

    // Add required files with standardized names
    // Always name the manifest "extension.yaml" in the package, regardless of source filename
    archive.file(manifestPath, { name: 'extension.yaml' });
    log(chalk.gray(`✓ Added extension.yaml (from ${path.basename(manifestPath)})`), isQuiet);

    // Always name the publisher config "publisher.json" in the package
    archive.file(publisherPath, { name: 'publisher.json' });
    log(chalk.gray(`✓ Added publisher.json`), isQuiet);

    // Add additional files if specified
    if (options.include && options.include.length > 0) {
      log(chalk.blue('\n📁 Adding additional files...'), isQuiet);
      for (const pattern of options.include) {
        if (await pathExists(pattern)) {
          const fileName = path.basename(pattern);
          archive.file(pattern, { name: fileName });
          log(chalk.gray(`✓ Added ${fileName}`), isQuiet);
        } else {
          log(chalk.yellow(`⚠️  File not found, skipping: ${pattern}`), isQuiet);
        }
      }
    }

    // Add common directories if they exist
    const commonDirectories = [
      { path: 'assets', description: 'assets' },
      { path: 'locales', description: 'localization files' }
    ];

    for (const dir of commonDirectories) {
      if (await pathExists(dir.path)) {
        archive.directory(dir.path, dir.path);
        log(chalk.gray(`✓ Added ${dir.path}/ directory (${dir.description})`), isQuiet);
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    if (error instanceof Error) {
      log(chalk.red(`❌ Failed to package extension: ${error.message}`), isQuiet);
      throw error; // Re-throw for test handling
    } else {
      log(chalk.red('❌ Failed to package extension: Unknown error'), isQuiet);
      throw new Error('Failed to package extension: Unknown error');
    }
  }
}
