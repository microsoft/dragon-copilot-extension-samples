import fs from 'fs-extra';
const { readFileSync } = fs;
import { load } from 'js-yaml';
import chalk from 'chalk';
import type { ConversationalManifest } from '../types.js';
import { validateConversationalManifest, formatErrors } from '../shared/schema-validator.js';

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🐉 Validating Dragon Copilot Conversational Extension Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  let manifest: ConversationalManifest;
  try {
    manifest = load(readFileSync(filePath, 'utf8')) as ConversationalManifest;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to parse manifest file: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }

  const result = validateConversationalManifest(manifest);
  result.warnings.forEach(warning => console.log(chalk.yellow(`⚠️  ${warning}`)));

  if (!result.isValid) {
    console.log(chalk.red('❌ Manifest validation failed with errors:'));
    formatErrors(result.errors).forEach(line => console.log(chalk.red(`  • ${line}`)));
    process.exit(1);
  }

  console.log(chalk.green('✅ Validation passed!'));
  console.log(chalk.gray(`\n  • Extension: ${manifest.name} v${manifest.version} (schema ${manifest.schemaVersion})`));
  console.log(chalk.gray(`  • Tools: ${manifest.tools.length}`));
  manifest.tools.forEach(tool => {
    const target = tool.endpoint ?? tool.specUrl ?? (tool.specString ? 'inline OpenAPI spec' : tool.agentIdentifier ?? '');
    console.log(chalk.gray(`    - ${tool.name} [${tool.type}] ${target}`));
  });
}
