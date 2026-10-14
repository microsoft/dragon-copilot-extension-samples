import fs from 'fs-extra';
const { readFileSync, writeFileSync, existsSync } = fs;
import { load, dump } from 'js-yaml';
import chalk from 'chalk';
import type { GenerateOptions, ConversationalManifest, ConversationalTool } from '../types.js';
import { createManifest, getToolTemplate } from '../templates/index.js';
import { promptExtensionDetails, promptTool, promptToolType } from '../shared/prompts.js';
import { validateConversationalManifest, formatErrors } from '../shared/schema-validator.js';

const PLACEHOLDER_DETAILS = {
  name: 'my-conversational-extension',
  caption: 'My Conversational Extension',
  description: 'A Dragon Copilot conversational extension',
  version: '0.1.0',
  tenantId: '00000000-0000-0000-0000-000000000000',
};

/**
 * Adds a tool to an existing manifest (or creates one) from a template or interactively.
 */
export async function generateManifest(options: GenerateOptions): Promise<void> {
  const outputPath = options.output || 'extension.yaml';
  console.log(chalk.blue('🐉 Generating Dragon Copilot Conversational Extension Manifest'));

  if (!options.template && !options.interactive) {
    throw new Error('Specify either --template <mcp|openapi|copilot-studio> or --interactive');
  }

  let manifest: ConversationalManifest | undefined;
  if (existsSync(outputPath)) {
    manifest = load(readFileSync(outputPath, 'utf8')) as ConversationalManifest;
    if (!manifest || !Array.isArray(manifest.tools)) {
      throw new Error(`${outputPath} is not a conversational extension manifest`);
    }
    console.log(chalk.gray(`📄 Adding a tool to ${outputPath}`));
  }

  const existingNames = manifest?.tools.map(t => t.name) ?? [];
  let tool: ConversationalTool;
  if (options.interactive) {
    tool = await promptTool(await promptToolType(), existingNames);
  } else {
    tool = getToolTemplate(options.template!);
    if (existingNames.includes(tool.name)) {
      throw new Error(`A tool named '${tool.name}' already exists in ${outputPath}`);
    }
  }

  if (manifest) {
    manifest.tools.push(tool);
  } else {
    const envelope = options.interactive ? await promptExtensionDetails({}) : PLACEHOLDER_DETAILS;
    manifest = createManifest(envelope, [tool]);
  }

  const result = validateConversationalManifest(manifest);
  if (!result.isValid) {
    formatErrors(result.errors).forEach(line => console.log(chalk.red(`  • ${line}`)));
    throw new Error('Generated manifest failed validation');
  }

  writeFileSync(outputPath, dump(manifest, { lineWidth: -1 }));
  console.log(chalk.green(`✅ Added ${tool.type} tool '${tool.name}' to ${outputPath}`));
  if (manifest.auth?.tenantId === PLACEHOLDER_DETAILS.tenantId) {
    console.log(chalk.yellow('   auth.tenantId is the all-zero placeholder; set your publisher tenant ID before packaging.'));
  }
  if (!options.interactive) {
    console.log(chalk.yellow('   Replace the placeholder endpoint / IDs with your own values.'));
  }
}
