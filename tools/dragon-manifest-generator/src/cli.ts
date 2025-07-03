#!/usr/bin/env node

import { Command } from 'commander';
import { generateManifest } from './commands/generate.js';
import { initProject } from './commands/init.js';
import { packageExtension } from './commands/package.js';
import { validateManifest } from './commands/validate.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('dragon-extension')
  .description('CLI tool for Dragon Copilot extension development and packaging')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new Dragon Copilot extension project')
  .option('-n, --name <name>', 'Extension name')
  .option('-d, --description <description>', 'Extension description')
  .option('-v, --version <version>', 'Extension version', '0.0.1')
  .option('-o, --output <path>', 'Output directory', '.')
  .action(initProject);

program
  .command('generate')
  .description('Generate a manifest file from a template')
  .option('-t, --template <template>', 'Template to use (note-analysis, speech-analysis, custom)')
  .option('-o, --output <path>', 'Output file path', 'manifest.yaml')
  .option('-i, --interactive', 'Interactive mode')
  .action(generateManifest);

program
  .command('validate')
  .description('Validate a manifest file')
  .argument('<file>', 'Manifest file to validate')
  .action(validateManifest);

program
  .command('package')
  .description('Package extension into a ZIP file')
  .option('-m, --manifest <path>', 'Manifest file path', 'manifest.yaml')
  .option('-o, --output <path>', 'Output ZIP file path')
  .option('-i, --include <patterns...>', 'Additional files to include')
  .action(packageExtension);

program.parse();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});
