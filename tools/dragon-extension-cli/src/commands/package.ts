import fs from 'fs-extra';
const { readFileSync, createReadStream, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { PackageOptions, DragonExtensionManifest } from '../types.js';

export async function packageExtension(options: PackageOptions): Promise<void> {
  console.log(chalk.blue('🐉 Packaging Dragon Copilot Extension'));

  const manifestPath = options.manifest || 'extension.yaml';

  // Validate manifest exists
  if (!(await pathExists(manifestPath))) {
    console.log(chalk.red(`❌ Manifest file not found: ${manifestPath}`));
    process.exit(1);
  }

  try {
    // Read and validate manifest
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as DragonExtensionManifest;

    if (!manifest.name || !manifest.version) {
      console.log(chalk.red('❌ Manifest must have name and version fields'));
      process.exit(1);
    }

    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

    console.log(chalk.gray(`📦 Creating package: ${outputPath}`));
    console.log(chalk.gray(`📄 Using manifest: ${manifestPath}\n`));

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
      console.log(chalk.gray(`📊 Total files: ${archive.pointer() > 0 ? 'Multiple' : '1'}`));
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

    // Add manifest file
    archive.file(manifestPath, { name: 'extension.yaml' });
    console.log(chalk.gray(`✓ Added extension.yaml`));

    // Add additional files if specified
    if (options.include && options.include.length > 0) {
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

    // Add common files if they exist
    const commonFiles = [
      'publisher.json',
    ];

    for (const fileName of commonFiles) {
      if (await pathExists(fileName)) {
        archive.file(fileName, { name: fileName });
        console.log(chalk.gray(`✓ Added ${fileName}`));
      }
    }

    // Check for assets directory
    const assetsDir = 'assets';
    if (await pathExists(assetsDir)) {
      archive.directory(assetsDir, 'assets');
      console.log(chalk.gray(`✓ Added assets/ directory`));
    }

    // Check for locales directory
    const localesDir = 'locales';
    if (await pathExists(localesDir)) {
      archive.directory(localesDir, 'locales');
      console.log(chalk.gray(`✓ Added locales/ directory`));
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
