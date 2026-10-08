import type { ConversationalManifest, ConversationalTool } from '../types.js';
import { CONVERSATIONAL_SCHEMA_VERSION } from '../types.js';

/**
 * Tool templates keyed by template name. Each mirrors a sample under conversational/src/samples.
 */
const toolTemplates: Record<string, () => ConversationalTool> = {
  mcp: () => ({
    name: 'order-extraction',
    caption: 'Order Extraction',
    description: 'Extract clinical orders mentioned in the current encounter transcript.',
    type: 'MCP',
    endpoint: 'https://mcp.example.com/mcp',
    triggers: ['IntentDriven'],
    expose: ['extract_orders'],
    customExtractors: {
      extract_orders: [{ propertyPath: '$.summary', extractorType: 'Response Text' }],
    },
    runtimeParamBindings: {
      extract_orders: [
        { source: 'transcript', target: 'argument', path: 'transcript', required: true },
        { source: 'conversationId', target: 'sideChannel', path: 'dragon.conversationId' },
      ],
    },
    timeout: 10,
  }),
  openapi: () => ({
    name: 'drug-interaction-check',
    caption: 'Drug Interaction Check',
    description: 'Check interactions between two medications.',
    type: 'OpenAPI',
    specUrl: 'https://api.example.com/openapi/v1.json',
    triggers: ['IntentDriven'],
    expose: ['checkDrugInteraction'],
    customExtractors: {
      checkDrugInteraction: [
        { propertyPath: '$.summary', extractorType: 'Response Text' },
        { propertyPath: '$.sources[*].url', extractorType: 'Evidence Link' },
      ],
    },
    runtimeParamBindings: {
      checkDrugInteraction: [
        { source: 'correlationId', target: 'header', path: 'x-correlation-id' },
      ],
    },
  }),
  'copilot-studio': () => ({
    name: 'scheduling-agent',
    caption: 'Appointment Scheduling',
    description: 'Handles appointment scheduling and rescheduling questions.',
    type: 'CopilotStudio',
    environmentId: '00000000-0000-0000-0000-000000000000',
    agentIdentifier: 'cr123_schedulingAgent',
    cloud: 'Prod',
    agentType: 'Published',
    timeout: 45,
    triggers: ['IntentDriven'],
    runtimeParamBindings: [{ source: 'locale', path: 'locale' }],
  }),
};

export const TEMPLATE_FOR_TYPE: Record<string, string> = {
  MCP: 'mcp',
  OpenAPI: 'openapi',
  CopilotStudio: 'copilot-studio',
};

export function listTemplates(): string[] {
  return Object.keys(toolTemplates);
}

export function getToolTemplate(templateName: string): ConversationalTool {
  const factory = toolTemplates[templateName];
  if (!factory) {
    throw new Error(`Template '${templateName}' not found. Available templates: ${listTemplates().join(', ')}`);
  }
  return factory();
}

export function createManifest(
  details: { name: string; caption: string; description: string; version: string; tenantId: string },
  tools: ConversationalTool[],
): ConversationalManifest {
  return {
    schemaVersion: CONVERSATIONAL_SCHEMA_VERSION,
    name: details.name,
    caption: details.caption,
    description: details.description,
    version: details.version,
    auth: { tenantId: details.tenantId },
    tools,
  };
}
