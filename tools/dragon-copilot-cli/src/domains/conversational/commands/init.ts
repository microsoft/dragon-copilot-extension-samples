import fs from 'fs-extra';
const { writeFileSync, existsSync } = fs;
import { dump } from 'js-yaml';
import path from 'path';
import chalk from 'chalk';
import type { InitOptions, ConversationalToolType } from '../types.js';
import { CONVERSATIONAL_TOOL_TYPES } from '../types.js';
import { promptExtensionDetails, promptTool, promptToolType } from '../shared/prompts.js';
import { createManifest } from '../templates/index.js';
import { validateConversationalManifest, formatErrors } from '../shared/schema-validator.js';

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🐉 Dragon Copilot Conversational Extension Generator'));
  console.log(chalk.gray('Creates an extension.yaml (schema 0.4.0-preview.2) with one conversational tool.\n'));

  let type: ConversationalToolType | undefined;
  if (options.type !== undefined) {
    const match = CONVERSATIONAL_TOOL_TYPES.find(t => t.toLowerCase() === options.type!.toLowerCase());
    if (!match) {
      throw new Error(`Unsupported type '${options.type}'. Use one of: ${CONVERSATIONAL_TOOL_TYPES.join(', ')}`);
    }
    type = match;
  }

  const outputPath = path.join(options.output || '.', 'extension.yaml');
  if (existsSync(outputPath)) {
    throw new Error(`${outputPath} already exists. Use 'dragon-copilot conversational generate' to add tools.`);
  }

  console.log(chalk.blue('📋 Step 1: Extension details'));
  const details = await promptExtensionDetails({
    ...(options.name ? { name: options.name } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.version ? { version: options.version } : {}),
  });

  console.log(chalk.blue('\n🛠️  Step 2: First tool'));
  const tool = await promptTool(type ?? await promptToolType());

  const manifest = createManifest(details, [tool]);
  const result = validateConversationalManifest(manifest);
  if (!result.isValid) {
    formatErrors(result.errors).forEach(line => console.log(chalk.red(`  • ${line}`)));
    throw new Error('Generated manifest failed validation');
  }

  writeFileSync(outputPath, dump(manifest, { lineWidth: -1 }));

  console.log(chalk.green(`\n✅ Created ${outputPath}`));
  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.gray('  1. Add tools:            dragon-copilot conversational generate --interactive'));
  console.log(chalk.gray('  2. Validate:             dragon-copilot conversational validate extension.yaml'));
  console.log(chalk.gray('  3. Package for upload:   dragon-copilot conversational package'));
}
