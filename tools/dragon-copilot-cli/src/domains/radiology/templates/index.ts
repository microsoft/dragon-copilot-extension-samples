import type { TemplateConfig } from '../types.js';

const templates: Record<string, TemplateConfig> = {
  'quality-check': {
    name: 'my-quality-check-extension',
    description: 'Provides radiology report quality checking',
    version: '0.0.1',
    tools: [
      {
        name: 'report-quality-checker',
        toolType: 'contractBased',
        capability: 'qualityCheck',
        description: 'Checks the quality of a radiology report',
        endpoint: 'https://publisher.example.com/quality-check',
        inputs: [
          {
            name: 'report',
            description: 'Radiology report from Dragon Copilot',
            'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json'
          }
        ],
        outputs: [
          {
            name: 'quality-result',
            description: 'Quality check findings and score',
            'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json'
          }
        ],
        relevanceFilteringCriteria: {
          relevantBodyParts: ['CHEST'],
          relevantModalities: ['CT']
        }
      }
    ]
  },

  'report-generation': {
    name: 'my-report-generation-extension',
    description: 'Provides radiology report generation',
    version: '0.0.1',
    tools: [
      {
        name: 'report-generator',
        toolType: 'contractBased',
        capability: 'qualityCheck',
        description: 'Generates a radiology report based on patient info and prior reports',
        endpoint: 'https://publisher.example.com/quality-result',
        inputs: [
          {
            name: 'report',
            description: 'Radiology report from Dragon Copilot',
            'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json'
          },
          {
            name: 'patient-info',
            description: 'Patient demographic information from Dragon Copilot',
            'content-type': 'application/vnd.ms-dragon.dsp.rad.patient-info+json'
          }
        ],
        outputs: [
          {
            name: 'quality-result',
            description: 'Report generation results',
            'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json'
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
