import fs from 'fs-extra';
const { readFileSync, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { logMessage, validatePngLogo } from '../../../common/index.js';
import type { PackageOptions, DragonExtensionManifest, PublisherConfig } from '../types.js';
import { validateExtensionManifest, validatePublisherConfig } from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';

export async function packageExtension(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';

  logMessage(chalk.blue('🐉 Packaging Dragon Copilot Extension'), isQuiet);

  const manifestPath = options.manifest || 'extension.yaml';
  const publisherPath = 'publisher.json';
  const logoPath = 'assets/logo_large.png';

  // Step 1: Validate required files exist
  logMessage(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
  logMessage(chalk.red(`❌ Extension manifest not found: ${manifestPath}`), isQuiet);
  logMessage(chalk.gray('   Create one using: dragon-extension init'), isQuiet);
    throw new Error(`Extension manifest not found: ${manifestPath}`);
  }

  if (!(await pathExists(publisherPath))) {
  logMessage(chalk.red(`❌ Publisher configuration not found: ${publisherPath}`), isQuiet);
  logMessage(chalk.gray('   A publisher.json file is required for packaging'), isQuiet);
  logMessage(chalk.gray('   Create one using: dragon-extension init --with-publisher'), isQuiet);
    throw new Error(`Publisher configuration not found: ${publisherPath}`);
  }

  // Step 1.5: Validate required logo
  logMessage(chalk.blue('🎨 Validating logo requirements...'), isQuiet);
  
  if (!(await pathExists(logoPath))) {
  logMessage(chalk.red(`❌ Required logo not found: ${logoPath}`), isQuiet);
  logMessage(chalk.gray('   A large logo (PNG, 216x216 to 350x350 px) is required for packaging'), isQuiet);
  logMessage(chalk.gray('   Create assets directory with logo using: dragon-extension init'), isQuiet);
    throw new Error(`Required logo not found: ${logoPath}`);
  }

  const isValidLogo = await validatePngLogo(logoPath, { silent: isQuiet });
  if (!isValidLogo) {
    logMessage(chalk.red(`❌ Logo validation failed: ${logoPath}`), isQuiet);
    logMessage(chalk.gray('   Requirements: PNG file, 216x216 to 350x350 pixels'), isQuiet);
    throw new Error(`Logo validation failed: ${logoPath}`);
  }

  logMessage(chalk.gray(`✓ Found extension manifest: ${manifestPath}`), isQuiet);
  logMessage(chalk.gray(`✓ Found publisher configuration: ${publisherPath}`), isQuiet);
  logMessage(chalk.gray(`✓ Found required logo: ${logoPath}`), isQuiet);

  try {
    // Step 2: Validate extension manifest
  logMessage(chalk.blue('\n📋 Validating extension manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as DragonExtensionManifest;

    const manifestValidation = validateExtensionManifest(manifest);
    if (!manifestValidation.isValid) {
  logMessage(chalk.red('❌ Extension manifest validation failed:'), isQuiet);
      manifestValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
  logMessage(chalk.red(`  • ${fieldName}: ${error.message}`), isQuiet);
      });
      throw new Error('Extension manifest validation failed');
    }
  logMessage(chalk.green('✅ Extension manifest is valid'), isQuiet);

    // Step 3: Validate publisher configuration
  logMessage(chalk.blue('📋 Validating publisher configuration...'), isQuiet);
    let publisherConfig: PublisherConfig;
    try {
      const publisherContent = readFileSync(publisherPath, 'utf8');
      publisherConfig = JSON.parse(publisherContent) as PublisherConfig;
    } catch (parseError) {
  logMessage(chalk.red('❌ Failed to parse publisher.json:'), isQuiet);
      if (parseError instanceof Error) {
  logMessage(chalk.red(`   ${parseError.message}`), isQuiet);
      }
      throw new Error('Failed to parse publisher.json');
    }

    const publisherValidation = validatePublisherConfig(publisherConfig);
    if (!publisherValidation.isValid) {
  logMessage(chalk.red('❌ Publisher configuration validation failed:'), isQuiet);
      publisherValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'config';
  logMessage(chalk.red(`  • ${fieldName}: ${error.message}`), isQuiet);
      });
      throw new Error('Publisher configuration validation failed');
    }
  logMessage(chalk.green('✅ Publisher configuration is valid'), isQuiet);

    // Step 4: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

  logMessage(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
  logMessage(chalk.gray(`🏢 Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`), isQuiet);
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
  logMessage(chalk.gray(`  • Extension manifest (extension.yaml)`), isQuiet);
  logMessage(chalk.gray(`  • Publisher configuration (publisher.json)`), isQuiet);
  logMessage(chalk.gray(`  • Large logo (assets/logo_large.png)`), isQuiet);
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

    // Always name the publisher config "publisher.json" in the package
    archive.file(publisherPath, { name: 'publisher.json' });
  logMessage(chalk.gray(`✓ Added publisher.json`), isQuiet);

    // Add required logo
    archive.file(logoPath, { name: 'assets/logo_large.png' });
  logMessage(chalk.gray(`✓ Added assets/logo_large.png`), isQuiet);

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

    // Add common directories if they exist (excluding assets since we handle it explicitly)
    const commonDirectories = [
      { path: 'locales', description: 'localization files' }
    ];

    for (const dir of commonDirectories) {
      if (await pathExists(dir.path)) {
        archive.directory(dir.path, dir.path);
  logMessage(chalk.gray(`✓ Added ${dir.path}/ directory (${dir.description})`), isQuiet);
      }
    }

    // Add other assets if they exist (but logo_large.png is already handled)
    if (await pathExists('assets')) {
      const assetsEntries = await fs.readdir('assets');
      const otherAssets = assetsEntries.filter(entry => entry !== 'logo_large.png');
      
      if (otherAssets.length > 0) {
        for (const asset of otherAssets) {
          const assetPath = path.join('assets', asset);
          if ((await fs.stat(assetPath)).isFile()) {
            archive.file(assetPath, { name: `assets/${asset}` });
            logMessage(chalk.gray(`✓ Added assets/${asset}`), isQuiet);
          }
        }
      }
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
