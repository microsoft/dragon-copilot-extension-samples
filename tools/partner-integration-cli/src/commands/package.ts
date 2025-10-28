import fs from 'fs-extra';
const { readFileSync, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { logMessage, validatePngLogo } from '@dragon-copilot/cli-common';
import type { PackageOptions, PartnerIntegrationManifest, PublisherConfig } from '../types.js';

export async function packageIntegration(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';

  logMessage(chalk.blue('🤝 Packaging Partner Integration'), isQuiet);

  const manifestPath = options.manifest || 'integration.yaml';
  const publisherPath = 'publisher.json';
  const logoPath = 'assets/logo_large.png';

  // Step 1: Validate required files exist
  logMessage(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
  logMessage(chalk.red(`❌ Integration manifest not found: ${manifestPath}`), isQuiet);
  logMessage(chalk.gray('   Create one using: partner-integration init'), isQuiet);
    throw new Error(`Integration manifest not found: ${manifestPath}`);
  }

  if (!(await pathExists(publisherPath))) {
  logMessage(chalk.red(`❌ Publisher configuration not found: ${publisherPath}`), isQuiet);
  logMessage(chalk.gray('   A publisher.json file is required for packaging'), isQuiet);
  logMessage(chalk.gray('   Create one using: partner-integration init'), isQuiet);
    throw new Error(`Publisher configuration not found: ${publisherPath}`);
  }

  // Step 1.5: Validate required logo
  logMessage(chalk.blue('🎨 Validating logo requirements...'), isQuiet);
  
  if (!(await pathExists(logoPath))) {
  logMessage(chalk.red(`❌ Required logo not found: ${logoPath}`), isQuiet);
  logMessage(chalk.gray('   A large logo (PNG, 216x216 to 350x350 px) is required for packaging'), isQuiet);
  logMessage(chalk.gray('   Create assets directory with logo using: partner-integration init'), isQuiet);
    throw new Error(`Required logo not found: ${logoPath}`);
  }

  const isValidLogo = await validatePngLogo(logoPath, { silent: isQuiet });
  if (!isValidLogo) {
    logMessage(chalk.red(`❌ Logo validation failed: ${logoPath}`), isQuiet);
    logMessage(chalk.gray('   Requirements: PNG file, 216x216 to 350x350 pixels'), isQuiet);
    throw new Error(`Logo validation failed: ${logoPath}`);
  }

  logMessage(chalk.gray(`✓ Found integration manifest: ${manifestPath}`), isQuiet);
  logMessage(chalk.gray(`✓ Found publisher configuration: ${publisherPath}`), isQuiet);
  logMessage(chalk.gray(`✓ Found required logo: ${logoPath}`), isQuiet);

  try {
    // Step 2: Load and validate integration manifest
  logMessage(chalk.blue('\n📋 Validating integration manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as PartnerIntegrationManifest;

    // Basic validation
    if (!manifest.name || !manifest.description || !manifest.version || !manifest['partner-id']) {
  logMessage(chalk.red('❌ Integration manifest validation failed: Missing required fields'), isQuiet);
      throw new Error('Integration manifest validation failed');
    }

    if (!Array.isArray(manifest['server-authentication']) || manifest['server-authentication'].length === 0) {
  logMessage(chalk.red('❌ Integration manifest validation failed: server-authentication requires at least one issuer entry'), isQuiet);
      throw new Error('Integration manifest validation failed');
    }

  logMessage(chalk.green('✅ Integration manifest is valid'), isQuiet);

    // Step 3: Load and validate publisher configuration
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

    // Basic publisher validation
    if (!publisherConfig.publisherId || !publisherConfig.publisherName) {
  logMessage(chalk.red('❌ Publisher configuration validation failed: Missing required fields'), isQuiet);
      throw new Error('Publisher configuration validation failed');
    }

  logMessage(chalk.green('✅ Publisher configuration is valid'), isQuiet);

    // Step 4: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

  logMessage(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
  logMessage(chalk.gray(`🏢 Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`), isQuiet);
  logMessage(chalk.gray(`📄 Integration: ${manifest.name} v${manifest.version}`), isQuiet);
  logMessage(chalk.gray(`🔑 Partner ID: ${manifest['partner-id']}`), isQuiet);
  logMessage(chalk.gray(`🔐 Server authentication issuers: ${manifest['server-authentication'].length}`), isQuiet);

    // Create archive
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise<void>(async (resolve, reject) => {
      output.on('close', () => {
        const sizeKB = Math.round(archive.pointer() / 1024);
  logMessage(chalk.green(`\n✅ Package created successfully!`), isQuiet);
  logMessage(chalk.gray(`📁 Output: ${outputPath}`), isQuiet);
  logMessage(chalk.gray(`📊 Size: ${sizeKB} KB (${archive.pointer()} bytes)`), isQuiet);

        // Next steps guidance
  logMessage(chalk.blue('\n🎯 What\'s Next?'), isQuiet);
  logMessage(chalk.yellow('📤 Deployment:'), isQuiet);
  logMessage(chalk.gray('   • Upload the ZIP file to the marketplace'), isQuiet);
  logMessage(chalk.gray('   • Configure integration endpoints in the admin panel'), isQuiet);
  logMessage(chalk.gray('   • Test the integration in a development environment'), isQuiet);

        resolve();
      });

      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);

      // Add core files
      archive.append(manifestContent, { name: 'integration.yaml' });
      archive.append(readFileSync(publisherPath), { name: 'publisher.json' });

      // Add assets
      if (await pathExists(logoPath)) {
        archive.file(logoPath, { name: 'assets/logo_large.png' });
      }

      // Add additional files if specified
      if (options.include && options.include.length > 0) {
  logMessage(chalk.blue('\n📎 Adding additional files...'), isQuiet);
        
        for (const pattern of options.include) {
          if (await pathExists(pattern)) {
            const stats = await fs.stat(pattern);
            if (stats.isFile()) {
              archive.file(pattern, { name: pattern });
              logMessage(chalk.gray(`✓ Added file: ${pattern}`), isQuiet);
            } else if (stats.isDirectory()) {
              archive.directory(pattern, pattern);
              logMessage(chalk.gray(`✓ Added directory: ${pattern}`), isQuiet);
            }
          } else {
            logMessage(chalk.yellow(`⚠️  File not found, skipping: ${pattern}`), isQuiet);
          }
        }
      }

      // Finalize archive
      archive.finalize();
    });

  } catch (error) {
    if (error instanceof Error) {
      logMessage(chalk.red(`❌ Packaging failed: ${error.message}`), isQuiet);
      throw error;
    }
    throw new Error('Unknown error during packaging');
  }
}