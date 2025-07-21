import fs from 'fs-extra';
const { readFileSync, createReadStream, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { PackageOptions, DragonExtensionManifest, PublisherConfig } from '../types.js';
import { validateExtensionManifest, validatePublisherConfig, SchemaError } from '../shared/schema-validator.js';

export async function packageExtension(options: PackageOptions): Promise<void> {
  console.log(chalk.blue('🐉 Packaging Dragon Copilot Extension'));

  const manifestPath = options.manifest || 'extension.yaml';
  const publisherPath = 'publisher.json';

  // Step 1: Validate required files exist
  console.log(chalk.blue('📋 Validating required files...'));

  if (!(await pathExists(manifestPath))) {
    console.log(chalk.red(`❌ Extension manifest not found: ${manifestPath}`));
    console.log(chalk.gray('   Create one using: dragon-extension init'));
    process.exit(1);
  }

  if (!(await pathExists(publisherPath))) {
    console.log(chalk.red(`❌ Publisher configuration not found: ${publisherPath}`));
    console.log(chalk.gray('   A publisher.json file is required for packaging'));
    console.log(chalk.gray('   Create one using: dragon-extension init --with-publisher'));
    process.exit(1);
  }

  console.log(chalk.gray(`✓ Found extension manifest: ${manifestPath}`));
  console.log(chalk.gray(`✓ Found publisher configuration: ${publisherPath}`));

  try {
    // Step 2: Validate extension manifest
    console.log(chalk.blue('\n📋 Validating extension manifest...'));
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as DragonExtensionManifest;

    const manifestValidation = validateExtensionManifest(manifest);
    if (!manifestValidation.isValid) {
      console.log(chalk.red('❌ Extension manifest validation failed:'));
      manifestValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'manifest';
        console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
      });
      process.exit(1);
    }
    console.log(chalk.green('✅ Extension manifest is valid'));

    // Step 3: Validate publisher configuration
    console.log(chalk.blue('📋 Validating publisher configuration...'));
    let publisherConfig: PublisherConfig;
    try {
      const publisherContent = readFileSync(publisherPath, 'utf8');
      publisherConfig = JSON.parse(publisherContent) as PublisherConfig;
    } catch (parseError) {
      console.log(chalk.red('❌ Failed to parse publisher.json:'));
      if (parseError instanceof Error) {
        console.log(chalk.red(`   ${parseError.message}`));
      }
      process.exit(1);
    }

    const publisherValidation = validatePublisherConfig(publisherConfig);
    if (!publisherValidation.isValid) {
      console.log(chalk.red('❌ Publisher configuration validation failed:'));
      publisherValidation.errors.forEach((error: SchemaError) => {
        const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
        const fieldName = fieldPath || 'config';
        console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
      });
      process.exit(1);
    }
    console.log(chalk.green('✅ Publisher configuration is valid'));

    // Step 4: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

    console.log(chalk.blue(`\n📦 Creating package: ${outputPath}`));
    console.log(chalk.gray(`🏢 Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`));
    console.log(chalk.gray(`📄 Extension: ${manifest.name} v${manifest.version}`));
    console.log(chalk.gray(`🛠️  Tools: ${manifest.tools?.length || 0}`));

    // Create ZIP archive
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive events
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(chalk.green(`\n✅ Package created successfully!`));
      console.log(chalk.gray(`📁 File: ${outputPath}`));
      console.log(chalk.gray(`📏 Size: ${sizeKB} KB`));

      // Package summary
      console.log(chalk.blue('\n📊 Package Contents:'));
      console.log(chalk.gray(`  • Extension manifest (extension.yaml)`));
      console.log(chalk.gray(`  • Publisher configuration (publisher.json)`));
      if (options.include && options.include.length > 0) {
        console.log(chalk.gray(`  • Additional files: ${options.include.length}`));
      }

      console.log(chalk.green('\n🎉 Ready for deployment!'));
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.log(chalk.yellow(`⚠️  Warning: ${err.message}`));
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      console.log(chalk.red(`❌ Archive error: ${err.message}`));
      process.exit(1);
    });

    archive.pipe(output);

    // Add required files with standardized names
    // Always name the manifest "extension.yaml" in the package, regardless of source filename
    archive.file(manifestPath, { name: 'extension.yaml' });
    console.log(chalk.gray(`✓ Added extension.yaml (from ${path.basename(manifestPath)})`));

    // Always name the publisher config "publisher.json" in the package
    archive.file(publisherPath, { name: 'publisher.json' });
    console.log(chalk.gray(`✓ Added publisher.json`));

    // Add additional files if specified
    if (options.include && options.include.length > 0) {
      console.log(chalk.blue('\n📁 Adding additional files...'));
      for (const pattern of options.include) {
        if (await pathExists(pattern)) {
          const fileName = path.basename(pattern);
          archive.file(pattern, { name: fileName });
          console.log(chalk.gray(`✓ Added ${fileName}`));
        } else {
          console.log(chalk.yellow(`⚠️  File not found, skipping: ${pattern}`));
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
        console.log(chalk.gray(`✓ Added ${dir.path}/ directory (${dir.description})`));
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`❌ Failed to package extension: ${error.message}`));
    } else {
      console.log(chalk.red('❌ Failed to package extension: Unknown error'));
    }
    process.exit(1);
  }
}
