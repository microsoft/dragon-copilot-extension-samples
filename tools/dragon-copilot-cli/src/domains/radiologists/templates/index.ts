import type { TemplateConfig } from '../types.js';

const templates: Record<string, TemplateConfig> = {
  'quality-check': {
    name: 'sampleQualityCheckExtension',
    description: 'Extension to provide radiology report quality checking',
    version: '0.0.1',
    radiologistsExtensibilityApiVersion: '1.0.0',
    tools: [
      {
        name: 'sampleQualityCheckTool',
        toolType: 'contractBased',
        capability: 'qualityCheck',
        description: 'Tool to check quality of a radiology report',
        endpoint: 'https://publisher.example.com/quality-check',
        inputs: [
          {
            name: 'report',
            description: 'Radiology report from Dragon Copilot',
            'content-type': 'application/vnd.ms-dragon.rad.report+json',
            schemaVersion: '1.0'
          },
          {
            name: 'patientInformation',
            description: 'Patient demographic information from Dragon Copilot',
            'content-type': 'application/vnd.ms-dragon.rad.patient-information+json',
            schemaVersion: '1.0'
          }
        ],
        outputs: [
          {
            name: 'qualityCheckResult',
            description: 'Quality check findings and score',
            'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json',
            schemaVersion: '1.0'
          }
        ],
        relevanceFilteringCriteria: {
          relevantBodyParts: ['CHEST'],
          relevantModalities: ['CT']
        }
      }
    ]
  },
  'pre-draft-report': {
    name: 'samplePreDraftReportExtension',
    description: 'Extension to provide pre-draft radiology report generation',
    version: '0.0.1',
    radiologistsExtensibilityApiVersion: '1.0.0',
    tools: [
      {
        name: 'preDraftReportGeneratorTool',
        toolType: 'partnerInitiated',
        capability: 'preDraftReportGeneration',
        description: 'Tool to generate a pre-draft radiology report',
        outputs: [
          {
            name: 'preDraftReportResult',
            description: 'Pre-draft radiology report',
            'content-type': 'application/vnd.ms-dragon.rad.pre-draft-report+json',
            schemaVersion: '1.0'
          }
        ],
        // Declarative for partnerInitiated tools; not currently enforced.
        relevanceFilteringCriteria: {
          relevantBodyParts: ['CHEST'],
          relevantModalities: ['CT']
        }
      }
    ]
  }
};

export function getTemplate(templateName: string): TemplateConfig {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
  }
  return template;
}

export function listTemplates(): string[] {
  return Object.keys(templates);
}
