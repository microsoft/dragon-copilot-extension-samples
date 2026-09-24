/**
 * Built-in radiologists manifest templates.
 *
 * Part of the pure manifest core — see `./types.ts`. Templates are treated as
 * immutable data: callers receive deep copies via `getTemplate`, so a generated
 * manifest can never mutate the shared definition (which matters for the
 * long-lived Extensions Sandbox server process).
 */
import type { TemplateConfig } from './types.js';
import {
  DEFAULT_CAPABILITY,
  DEFAULT_OUTPUT_CONTENT_TYPE,
  DEFAULT_PAYLOAD_SCHEMA_VERSION,
  DEFAULT_TOOL_TYPE,
  PATIENT_INFORMATION_CONTENT_TYPE,
  REPORT_CONTENT_TYPE,
  getInputDescription,
} from './choices.js';

const templates: Record<string, TemplateConfig> = {
  'quality-check': {
    name: 'sampleQualityCheckExtension',
    description: 'Extension to provide radiology report quality checking',
    version: '0.0.1',
    radiologistsExtensibilityApiVersion: '1.0.0',
    tools: [
      {
        name: 'sampleQualityCheckTool',
        toolType: DEFAULT_TOOL_TYPE,
        capability: DEFAULT_CAPABILITY,
        description: 'Tool to check quality of a radiology report',
        endpoint: 'https://publisher.example.com/quality-check',
        inputs: [
          {
            name: 'report',
            description: getInputDescription(REPORT_CONTENT_TYPE),
            'content-type': REPORT_CONTENT_TYPE,
            schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION
          },
          {
            name: 'patientInformation',
            description: getInputDescription(PATIENT_INFORMATION_CONTENT_TYPE),
            'content-type': PATIENT_INFORMATION_CONTENT_TYPE,
            schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION
          }
        ],
        outputs: [
          {
            name: 'qualityCheckResult',
            description: 'Quality check findings and score',
            'content-type': DEFAULT_OUTPUT_CONTENT_TYPE,
            schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION
          }
        ],
        relevanceFilteringCriteria: {
          relevantBodyParts: ['CHEST'],
          relevantModalities: ['CT']
        }
      }
    ]
  }
};

/** Human-readable summary of a template, used to populate selection UIs. */
export interface TemplateSummary {
  /** Template id passed to `getTemplate` (e.g. `quality-check`). */
  id: string;
  /** Extension name the template generates. */
  name: string;
  description: string;
  version: string;
  toolCount: number;
}

/**
 * Deep-copies plain JSON data. Templates contain only JSON-safe values.
 */
function cloneTemplate(template: TemplateConfig): TemplateConfig {
  return JSON.parse(JSON.stringify(template)) as TemplateConfig;
}

/**
 * Returns a deep copy of a built-in template.
 *
 * @throws if the template name is unknown.
 */
export function getTemplate(templateName: string): TemplateConfig {
  // Own-property check: a bare lookup would resolve inherited keys such as
  // '__proto__' or 'constructor' and slip past the guard below. The name can
  // come straight from a request body (the Extensions Sandbox wizard).
  // `hasOwnProperty.call` rather than `Object.hasOwn`: this core compiles under
  // the CLI's ES2020 lib as well as the sandbox's ES2022 one — see `./index.ts`.
  const template = Object.prototype.hasOwnProperty.call(templates, templateName)
    ? templates[templateName]
    : undefined;
  if (!template) {
    throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
  }
  return cloneTemplate(template);
}

export function listTemplates(): string[] {
  return Object.keys(templates);
}

export function listTemplateSummaries(): TemplateSummary[] {
  return Object.entries(templates).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
    version: template.version,
    toolCount: template.tools.length,
  }));
}
