import fs from 'fs-extra';
const { readFileSync, createWriteStream, pathExists } = fs;
import yaml from 'js-yaml';
const { load } = yaml;
import archiver from 'archiver';
import chalk from 'chalk';
import { logMessage } from '../../../common/index.js';
import type { PackageOptions, ConnectorIntegrationManifest } from '../types.js';

export async function packageIntegration(options: PackageOptions): Promise<void> {
  const isQuiet = options.silent || process.env.NODE_ENV === 'test';

  logMessage(chalk.blue('🤝 Packaging Clinical Application Connector'), isQuiet);

  const manifestPath = options.manifest || 'extension.yaml';

  // Step 1: Validate required files exist
  logMessage(chalk.blue('📋 Validating required files...'), isQuiet);

  if (!(await pathExists(manifestPath))) {
    logMessage(chalk.red(`❌ Integration manifest not found: ${manifestPath}`), isQuiet);
    logMessage(chalk.gray('   Create one using: dragon-copilot connector init'), isQuiet);
    throw new Error(`Integration manifest not found: ${manifestPath}`);
  }

  logMessage(chalk.gray(`✓ Found integration manifest: ${manifestPath}`), isQuiet);

  try {
    // Step 2: Load and validate integration manifest
    logMessage(chalk.blue('\n📋 Validating integration manifest...'), isQuiet);
    const manifestContent = readFileSync(manifestPath, 'utf8');
    const manifest = load(manifestContent) as ConnectorIntegrationManifest;

    // Basic validation
    if (
      !manifest.name ||
      !manifest.description ||
      !manifest.version ||
      !manifest['partner-id'] ||
      !manifest['clinical-application-name']
    ) {
      logMessage(chalk.red('❌ Integration manifest validation failed: Missing required fields'), isQuiet);
      throw new Error('Integration manifest validation failed');
    }

    if (!Array.isArray(manifest['server-authentication']) || manifest['server-authentication'].length === 0) {
      logMessage(chalk.red('❌ Integration manifest validation failed: server-authentication requires at least one issuer entry'), isQuiet);
      throw new Error('Integration manifest validation failed');
    }

    logMessage(chalk.green('✅ Integration manifest is valid'), isQuiet);

    // Step 3: Create package
    const outputPath = options.output || `${manifest.name}-${manifest.version}.zip`;

    logMessage(chalk.blue(`\n📦 Creating package: ${outputPath}`), isQuiet);
    logMessage(chalk.gray(`📄 Integration: ${manifest.name} v${manifest.version}`), isQuiet);
    logMessage(chalk.gray(`🩺 Clinical application: ${manifest['clinical-application-name']}`), isQuiet);
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

      // Add manifest
      archive.append(manifestContent, { name: 'extension.yaml' });

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

      // Add locales directory if it exists
      if (await pathExists('locales')) {
        archive.directory('locales', 'locales');
        logMessage(chalk.gray(`✓ Added locales/ directory`), isQuiet);
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
