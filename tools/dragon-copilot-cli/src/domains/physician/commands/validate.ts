import fs from 'fs-extra';
const { readFileSync, existsSync } = fs;
import { load } from 'js-yaml';
import chalk from 'chalk';
import type { DragonExtensionManifest } from '../types.js';
import {
  validateExtensionManifest,
  formatErrors,
  PLACEHOLDER_TENANT_ID,
  PLACEHOLDER_TENANT_WARNING,
  LEGACY_SCHEMA_VERSION,
  LATEST_SCHEMA_VERSION
} from '../shared/schema-validator.js';

interface ToolSummary {
  name: string;
  type?: string;
  inputs?: unknown[];
  outputs?: unknown[];
  endpoint?: string;
  specUrl?: string;
  specString?: string;
  agentIdentifier?: string;
}

function describeTool(tool: ToolSummary): string {
  if (!tool.type || tool.type === 'DragonAPI') {
    return `${tool.name}: ${tool.inputs?.length || 0} inputs, ${tool.outputs?.length || 0} outputs`;
  }
  const target = tool.endpoint ?? tool.specUrl ?? (tool.specString ? 'inline OpenAPI spec' : tool.agentIdentifier ?? '');
  return `${tool.name} [${tool.type}] ${target}`;
}

export async function validateManifest(filePath: string): Promise<void> {
  console.log(chalk.blue('🐉 Validating Dragon Copilot Physician Workflow Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  if (!existsSync(filePath)) {
    console.log(chalk.red(`❌ Manifest file not found: ${filePath}`));
    process.exit(1);
  }

  let hasErrors = false;
  let hasWarnings = false;

  try {
    const fileContent = readFileSync(filePath, 'utf8');
    const manifest = load(fileContent) as DragonExtensionManifest;

    console.log(chalk.blue('📋 Validating Physician Workflow Manifest...'));
    const manifestResult = validateExtensionManifest(manifest);
    const schemaVersion = manifestResult.schemaVersion;

    if (schemaVersion === LEGACY_SCHEMA_VERSION) {
      console.log(chalk.gray('  • Schema: original format (no schemaVersion)'));
    } else if (schemaVersion) {
      console.log(chalk.gray(`  • Schema: ${schemaVersion}`));
    }

    if (manifestResult.errors.length > 0) {
      hasErrors = true;
      console.log(chalk.red('❌ Manifest validation failed with errors:'));
      formatErrors(manifestResult.errors).forEach(line => console.log(chalk.red(`  • ${line}`)));
    }

    manifestResult.warnings?.forEach(warning => {
      hasWarnings = true;
      console.log(chalk.yellow(`⚠️  ${warning}`));
    });
    if (manifest?.auth?.tenantId === PLACEHOLDER_TENANT_ID) {
      hasWarnings = true;
      console.log(chalk.yellow(`⚠️  ${PLACEHOLDER_TENANT_WARNING}`));
    }

    if (schemaVersion === LEGACY_SCHEMA_VERSION && LATEST_SCHEMA_VERSION !== LEGACY_SCHEMA_VERSION) {
      hasWarnings = true;
      console.log(chalk.yellow(`⚠️  This manifest has no schemaVersion and uses the original format. Run 'dragon-copilot physician migrate ${filePath}' to upgrade to ${LATEST_SCHEMA_VERSION}.`));
    }

    if (!hasErrors) {
      console.log(chalk.green(`\n✅ Validation passed!${schemaVersion && schemaVersion !== LEGACY_SCHEMA_VERSION ? ` (schema ${schemaVersion})` : ''}`));

      console.log(chalk.gray('\n📊 Physician Workflow Summary:'));
      console.log(chalk.gray(`  • Extension: ${manifest.name} v${manifest.version}`));
      console.log(chalk.gray(`  • Description: ${manifest.description}`));
      console.log(chalk.gray(`  • Auth Tenant ID: ${manifest.auth?.tenantId || 'Not specified'}`));
      console.log(chalk.gray(`  • Tools: ${manifest.tools?.length || 0}`));

      const tools = (manifest.tools ?? []) as ToolSummary[];
      tools.forEach(tool => console.log(chalk.gray(`    - ${describeTool(tool)}`)));

      if (hasWarnings) {
        console.log(chalk.yellow('\n💡 Consider addressing the warnings above for better compliance.'));
      }
    } else {
      process.exit(1);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red(`❌ Failed to parse manifest file: ${error.message}`));
    } else {
      console.log(chalk.red('❌ Failed to parse manifest file: Unknown error'));
    }
    process.exit(1);
  }
}
