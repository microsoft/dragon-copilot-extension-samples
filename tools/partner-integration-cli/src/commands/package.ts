import fs from 'fs-extra';
const { readFileSync, createReadStream, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import path from 'path';
import chalk from 'chalk';
import { PackageOptions, PartnerIntegrationManifest, PublisherConfig } from '../types.js';

// Helper function for conditional logging
function log(message: string, silent: boolean = false): void {
  if (!silent && process.env.NODE_ENV !== 'test') {
    console.log(message);
  }
}

// Helper function to validate logo requirements
async function validateLogo(logoPath: string, silent: boolean = false): Promise<boolean> {
  if (!(await pathExists(logoPath))) {
    return false;
  }

  try {
    // Basic file validation - check if it's a PNG file
    const stats = await fs.stat(logoPath);
    if (stats.size === 0) {
      log(chalk.red(`❌ Logo file is empty: ${logoPath}`), silent);
      return false;
    }

    // Check if it's a PNG file by reading the header
    const buffer = await fs.readFile(logoPath);
    const isPNG = buffer.length >= 8 && 
                  buffer[0] === 0x89 && buffer[1] === 0x50 && 
                  buffer[2] === 0x4E && buffer[3] === 0x47 &&
                  buffer[4] === 0x0D && buffer[5] === 0x0A && 
                  buffer[6] === 0x1A && buffer[7] === 0x0A;

    if (!isPNG) {
      log(chalk.red(`❌ Logo file is not a valid PNG: ${logoPath}`), silent);
      return false;
    }

    log(chalk.gray(`✓ Logo validation passed: ${logoPath}`), silent);
    return true;
  } catch (error) {
    log(chalk.red(`❌ Error validating logo: ${error instanceof Error ? error.message : 'Unknown error'}`), silent);
    return false;
  }
}

export async function packageIntegration(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';

  log(chalk.blue('🤝 Packaging Partner Integration'), isQuiet);

  const manifestPath = options.manifest || 'integration.yaml';
  const publisherPath = 'publisher.json';
  const logoPath = 'assets/logo_large.png';

  // Step 1: Validate required files exist
  log(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
    log(chalk.red(`❌ Integration manifest not found: ${manifestPath}`), isQuiet);
    log(chalk.gray('   Create one using: partner-integration init'), isQuiet);
    throw new Error(`Integration manifest not found: ${manifestPath}`);
  }

  if (!(await pathExists(publisherPath))) {
    log(chalk.red(`❌ Publisher configuration not found: ${publisherPath}`), isQuiet);
    log(chalk.gray('   A publisher.json file is required for packaging'), isQuiet);
    log(chalk.gray('   Create one using: partner-integration init'), isQuiet);
    throw new Error(`Publisher configuration not found: ${publisherPath}`);
  }

  // Step 1.5: Validate required logo
  log(chalk.blue('🎨 Validating logo requirements...'), isQuiet);
  
  if (!(await pathExists(logoPath))) {
    log(chalk.red(`❌ Required logo not found: ${logoPath}`), isQuiet);
    log(chalk.gray('   A large logo (PNG, 216x216 to 350x350 px) is required for packaging'), isQuiet);
    log(chalk.gray('   Create assets directory with logo using: partner-integration init'), isQuiet);
    throw new Error(`Required logo not found: ${logoPath}`);
  }

  const isValidLogo = await validateLogo(logoPath, isQuiet);
  if (!isValidLogo) {
    log(chalk.red(`❌ Logo validation failed: ${logoPath}`), isQuiet);
    log(chalk.gray('   Requirements: PNG file, 216x216 to 350x350 pixels'), isQuiet);
    throw new Error(`Logo validation failed: ${logoPath}`);
  }

  log(chalk.gray(`✓ Found integration manifest: ${manifestPath}`), isQuiet);
  log(chalk.gray(`✓ Found publisher configuration: ${publisherPath}`), isQuiet);
  log(chalk.gray(`✓ Found required logo: ${logoPath}`), isQuiet);

  try {
    // Step 2: Load and validate integration manifest
    log(chalk.blue('\n📋 Validating integration manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as PartnerIntegrationManifest;

    // Basic validation
    if (!manifest.name || !manifest.description || !manifest.version || !manifest['partner-id']) {
      log(chalk.red('❌ Integration manifest validation failed: Missing required fields'), isQuiet);
      throw new Error('Integration manifest validation failed');
    }

    if (!Array.isArray(manifest['server-authentication']) || manifest['server-authentication'].length === 0) {
      log(chalk.red('❌ Integration manifest validation failed: server-authentication requires at least one issuer entry'), isQuiet);
      throw new Error('Integration manifest validation failed');
    }

    log(chalk.green('✅ Integration manifest is valid'), isQuiet);

    // Step 3: Load and validate publisher configuration
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

    // Basic publisher validation
    if (!publisherConfig.publisherId || !publisherConfig.publisherName) {
      log(chalk.red('❌ Publisher configuration validation failed: Missing required fields'), isQuiet);
      throw new Error('Publisher configuration validation failed');
    }

    log(chalk.green('✅ Publisher configuration is valid'), isQuiet);

    // Step 4: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

    log(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
    log(chalk.gray(`🏢 Publisher: ${publisherConfig.publisherName} (${publisherConfig.publisherId})`), isQuiet);
    log(chalk.gray(`📄 Integration: ${manifest.name} v${manifest.version}`), isQuiet);
    log(chalk.gray(`🔑 Partner ID: ${manifest['partner-id']}`), isQuiet);
    log(chalk.gray(`🔐 Server authentication issuers: ${manifest['server-authentication'].length}`), isQuiet);

    // Create archive
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise<void>(async (resolve, reject) => {
      output.on('close', () => {
        const sizeKB = Math.round(archive.pointer() / 1024);
        log(chalk.green(`\n✅ Package created successfully!`), isQuiet);
        log(chalk.gray(`📁 Output: ${outputPath}`), isQuiet);
        log(chalk.gray(`📊 Size: ${sizeKB} KB (${archive.pointer()} bytes)`), isQuiet);

        // Next steps guidance
        log(chalk.blue('\n🎯 What\'s Next?'), isQuiet);
        log(chalk.yellow('📤 Deployment:'), isQuiet);
        log(chalk.gray('   • Upload the ZIP file to the marketplace'), isQuiet);
        log(chalk.gray('   • Configure integration endpoints in the admin panel'), isQuiet);
        log(chalk.gray('   • Test the integration in a development environment'), isQuiet);

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
        log(chalk.blue('\n📎 Adding additional files...'), isQuiet);
        
        for (const pattern of options.include) {
          if (await pathExists(pattern)) {
            const stats = await fs.stat(pattern);
            if (stats.isFile()) {
              archive.file(pattern, { name: pattern });
              log(chalk.gray(`✓ Added file: ${pattern}`), isQuiet);
            } else if (stats.isDirectory()) {
              archive.directory(pattern, pattern);
              log(chalk.gray(`✓ Added directory: ${pattern}`), isQuiet);
            }
          } else {
            log(chalk.yellow(`⚠️  File not found, skipping: ${pattern}`), isQuiet);
          }
        }
      }

      // Finalize archive
      archive.finalize();
    });

  } catch (error) {
    if (error instanceof Error) {
      log(chalk.red(`❌ Packaging failed: ${error.message}`), isQuiet);
      throw error;
    }
    throw new Error('Unknown error during packaging');
  }
}