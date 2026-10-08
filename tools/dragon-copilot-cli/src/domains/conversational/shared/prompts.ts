import { input, select, confirm } from '@inquirer/prompts';
import type { ConversationalTool, ConversationalToolType } from '../types.js';
import { CONVERSATIONAL_TOOL_TYPES } from '../types.js';

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const required = (label: string) => (value: string) => value.trim().length > 0 || `${label} is required`;
const matches = (pattern: RegExp, message: string) => (value: string) => pattern.test(value.trim()) || message;
const httpsUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.hostname === 'localhost' || 'Use an https:// URL';
  } catch {
    return 'Enter a valid URL';
  }
};

export async function promptExtensionDetails(defaults: { name?: string; description?: string; version?: string }) {
  const name = defaults.name ?? await input({
    message: 'Extension name (lowercase, numbers, hyphens):',
    default: 'my-conversational-extension',
    validate: matches(NAME_PATTERN, 'Use lowercase letters, numbers and hyphens, starting with a letter'),
  });
  const caption = await input({ message: 'Display caption:', default: 'My Conversational Extension', validate: required('Caption') });
  const description = defaults.description ?? await input({
    message: 'Extension description:',
    default: 'A Dragon Copilot conversational extension',
    validate: required('Description'),
  });
  const version = defaults.version ?? await input({
    message: 'Version (x.y.z):',
    default: '0.1.0',
    validate: matches(VERSION_PATTERN, 'Use x.y.z'),
  });
  const tenantId = await input({
    message: 'Microsoft Entra tenant ID of your publisher app:',
    default: '00000000-0000-0000-0000-000000000000',
    validate: matches(GUID_PATTERN, 'Enter a GUID'),
  });

  return { name: name.trim(), caption: caption.trim(), description: description.trim(), version: version.trim(), tenantId: tenantId.trim() };
}

export async function promptToolType(): Promise<ConversationalToolType> {
  return select<ConversationalToolType>({
    message: 'Integration type:',
    choices: CONVERSATIONAL_TOOL_TYPES.map(value => ({
      value,
      name: value === 'MCP' ? 'MCP – Model Context Protocol server'
        : value === 'OpenAPI' ? 'OpenAPI – REST API described by an OpenAPI document'
          : 'CopilotStudio – published Microsoft Copilot Studio agent',
    })),
  });
}

export async function promptTool(type: ConversationalToolType, existingNames: string[] = []): Promise<ConversationalTool> {
  const name = (await input({
    message: 'Tool name:',
    validate: (value: string) => {
      const v = value.trim();
      if (!NAME_PATTERN.test(v)) {
        return 'Use lowercase letters, numbers and hyphens, starting with a letter';
      }
      return !existingNames.includes(v) || `A tool named '${v}' already exists`;
    },
  })).trim();
  const caption = (await input({ message: 'Tool caption:', validate: required('Caption') })).trim();
  const description = (await input({
    message: 'When should Dragon Copilot use this tool? (description used for intent routing):',
    validate: required('Description'),
  })).trim();

  const tool: ConversationalTool = { name, caption, description, type, triggers: ['IntentDriven'] };

  if (type === 'MCP') {
    tool.endpoint = (await input({ message: 'MCP endpoint (streamable HTTP):', default: 'https://mcp.example.com/mcp', validate: httpsUrl })).trim();
  } else if (type === 'OpenAPI') {
    tool.specUrl = (await input({ message: 'OpenAPI document URL:', default: 'https://api.example.com/openapi/v1.json', validate: httpsUrl })).trim();
  } else {
    tool.environmentId = (await input({ message: 'Copilot Studio environment ID:', validate: matches(GUID_PATTERN, 'Enter a GUID') })).trim();
    tool.agentIdentifier = (await input({ message: 'Agent schema name (Settings > Advanced > Metadata):', validate: required('Agent schema name') })).trim();
    tool.cloud = 'Prod';
    tool.agentType = 'Published';
  }

  if (type !== 'CopilotStudio') {
    const expose = (await input({
      message: type === 'MCP'
        ? 'MCP tool names to expose (comma separated, empty = all):'
        : 'OpenAPI operationIds to expose (comma separated, empty = all):',
    })).split(',').map(s => s.trim()).filter(Boolean);
    if (expose.length > 0) {
      tool.expose = expose;
    }
  }

  if (await confirm({ message: 'Set a custom timeout (seconds)?', default: false })) {
    const timeout = await input({
      message: 'Timeout in seconds:',
      default: '30',
      validate: (value: string) => (Number.isInteger(Number(value)) && Number(value) > 0) || 'Enter a positive integer',
    });
    tool.timeout = Number(timeout);
  }

  return tool;
}
