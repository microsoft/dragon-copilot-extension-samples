import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync, existsSync, ensureDirSync } = fs;
import { dump } from 'js-yaml';
import path from 'path';
import chalk from 'chalk';
import type { InitOptions, ToolType } from '../types.js';
import { TOOL_TYPES } from '../types.js';
import {
  promptExtensionDetails,
  promptToolDetails,
  promptAuthDetails,
  isLegacySchema,
  validateToolType
} from '../shared/prompts.js';
import { buildManifest, buildTool } from '../shared/manifest-builder.js';
import {
  resolveRequestedSchemaVersion,
  validateExtensionManifest,
  formatErrors,
  PLACEHOLDER_TENANT_ID,
  PLACEHOLDER_TENANT_WARNING
} from '../shared/schema-validator.js';

/** Case-insensitive `--type` lookup, checked against the schema version. */
export function resolveToolType(type: string, schemaVersion: string): ToolType {
  const match = TOOL_TYPES.find(candidate => candidate.toLowerCase() === type.trim().toLowerCase());
  const check = validateToolType(match ?? type, schemaVersion);
  if (check !== true) {
    throw new Error(String(check));
  }
  return match!;
}

export async function initProject(options: InitOptions): Promise<void> {
  console.log(chalk.blue('🐉 Dragon Copilot Physician Workflow Generator'));
  console.log(chalk.gray('Initializing a new physician workflow project...\n'));

  const schemaVersion = resolveRequestedSchemaVersion(options.schemaVersion);
  console.log(chalk.gray(isLegacySchema(schemaVersion)
    ? 'Using the original manifest format (no schemaVersion).\n'
    : `Using manifest schema version ${schemaVersion}.\n`));

  const toolType = options.type !== undefined ? resolveToolType(options.type, schemaVersion) : undefined;

  // Fail before prompting so answers aren't lost.
  const outputPath = path.join(options.output || '.', 'extension.yaml');
  if (existsSync(outputPath)) {
    throw new Error(`${outputPath} already exists. Use 'dragon-copilot physician generate --interactive' to add tools.`);
  }

  // Step 1: Physician Workflow Details
  console.log(chalk.blue('📝 Step 1: Physician Workflow Details'));
  console.log(chalk.gray('Let\'s start with basic information about your extension.\n'));

  const extensionDetails = await promptExtensionDetails({
    ...(options.name ? { name: options.name } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.version ? { version: options.version } : {})
  }, schemaVersion);

  // Step 2: Authentication Configuration
  console.log(chalk.blue('\n🔐 Step 2: Authentication Configuration'));
  console.log(chalk.gray('Configure Azure Entra ID authentication for your extension.\n'));

  const authDetails = await promptAuthDetails();

  // Step 3: Physician Workflow Tools
  console.log(chalk.blue('\n🛠️  Step 3: Physician Workflow Tools'));
  console.log(chalk.gray('Tools define the AI-powered functionality your extension provides.'));
  console.log(chalk.gray('Each tool processes specific types of clinical data and returns results.\n'));

  const addTool = toolType !== undefined || await confirm({
    message: 'Add an initial tool?',
    default: true
  });

  const manifest = buildManifest(extensionDetails, { tenantId: authDetails.tenantId }, schemaVersion);

  if (addTool) {
    // Use shared prompt for tool details (single input for init)
    const toolDetails = await promptToolDetails(undefined, {
      allowMultipleInputs: true, // Allow multiple inputs for flexibility
      schemaVersion,
      ...(toolType ? { toolType } : {}),
      defaults: {
        toolName: 'my-tool',
        toolDescription: 'Processes clinical data',
        endpoint: 'https://api.example.com/tool-route/v1/process'
      }
    });

    (manifest.tools as unknown[]).push(buildTool(toolDetails, schemaVersion));
  }

  const result = validateExtensionManifest(manifest);
  if (!result.isValid) {
    formatErrors(result.errors).forEach(line => console.log(chalk.red(`  • ${line}`)));
    throw new Error('Generated manifest failed validation');
  }

  ensureDirSync(path.dirname(outputPath));
  writeFileSync(outputPath, dump(manifest, { lineWidth: -1 }));

  console.log(chalk.green('\n✅ Physician workflow project initialized successfully!'));
  console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));
  if (manifest.auth?.tenantId === PLACEHOLDER_TENANT_ID) {
    console.log(chalk.yellow(`⚠️  ${PLACEHOLDER_TENANT_WARNING}`));
  }

  // Enhanced next steps with better organization
  console.log(chalk.blue('\n🎯 What\'s Next?'));

  const tools = manifest.tools as Array<{ type?: string }>;
  const addedType = addTool ? tools[tools.length - 1]?.type : undefined;
  if (addedType !== undefined && addedType !== 'DragonAPI') {
    console.log(chalk.yellow('🛠️  Development Steps:'));
    if (addedType === 'MCP') {
      console.log(chalk.gray('   1. Set endpoint to your public HTTPS MCP server URL'));
    } else if (addedType === 'OpenAPI') {
      console.log(chalk.gray('   1. Set specUrl to your public OpenAPI document (or use specString)'));
    } else {
      console.log(chalk.gray('   1. Set environmentId and agentIdentifier from Copilot Studio (Settings > Advanced > Metadata)'));
    }
    console.log(chalk.gray('   2. Make the tool description say clearly when Dragon Copilot should use it'));
    console.log(chalk.gray(addedType === 'CopilotStudio'
      ? '   3. Optionally add runtimeParamBindings'
      : '   3. Optionally add expose, customExtractors and runtimeParamBindings'));
    console.log(chalk.gray('   4. Validate: dragon-copilot physician validate'));
    console.log(chalk.gray('   Guide: physician/CONVERSATIONAL.md in the dragon-copilot-extension-samples repository'));

    console.log(chalk.yellow('\n📦 Deployment Steps:'));
    console.log(chalk.gray('   1. Package your extension: dragon-copilot physician package'));
    console.log(chalk.gray('   2. Upload it in the Dragon admin center or publish it to the marketplace'));
  } else if (addTool) {
    console.log(chalk.yellow('🛠️  Development Steps:'));
    console.log(chalk.gray('   1. Update the endpoint URL with your actual API'));
    console.log(chalk.gray('   2. Customize inputs and outputs as needed'));
    console.log(chalk.gray('   3. Test your extension locally'));

    console.log(chalk.yellow('\n📦 Deployment Steps:'));
    console.log(chalk.gray('   1. Package your extension: dragon-copilot physician package'));
    console.log(chalk.gray('   2. Deploy to the marketplace'));
  } else {
    console.log(chalk.yellow('🔧 Next Steps:'));
    console.log(chalk.gray('   1. Add tools to your extension: dragon-copilot physician generate --interactive'));
    console.log(chalk.gray('   2. Update the manifest with your API endpoints'));
    console.log(chalk.gray('   3. Test and package your extension'));
  }

  console.log(chalk.blue('\n📚 Resources:'));
  console.log(chalk.gray('   • Validate your extension: dragon-copilot physician validate'));
  console.log(chalk.gray('   • Add more tools: dragon-copilot physician generate --interactive'));
  console.log(chalk.gray('   • Package for deployment: dragon-copilot physician package'));
}
