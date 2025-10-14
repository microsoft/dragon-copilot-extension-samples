import { TemplateConfig } from '../types.js';

const templates: Record<string, TemplateConfig> = {
  'ehr-integration': {
    name: 'ehr-integration',
    description: 'EHR system integration for patient data synchronization',
    version: '0.0.1',
    tools: [
      {
        name: 'patient-sync',
        description: 'Synchronizes patient data between EHR and Dragon Copilot',
        endpoint: 'https://api.example.com/ehr/patient-sync/v1/process',
        inputs: [
          {
            name: 'patient-record',
            description: 'EHR patient record data',
            data: 'EHR/PatientRecord'
          }
        ],
        outputs: [
          {
            name: 'synchronized-patient',
            description: 'Synchronized patient data in DSP format',
            data: 'DSP/Patient'
          }
        ]
      },
      {
        name: 'appointment-sync',
        description: 'Synchronizes appointment data with EHR systems',
        endpoint: 'https://api.example.com/ehr/appointment-sync/v1/process',
        inputs: [
          {
            name: 'appointment',
            description: 'EHR appointment data',
            data: 'EHR/Appointment'
          }
        ],
        outputs: [
          {
            name: 'synchronized-appointment',
            description: 'Synchronized appointment data in DSP format',
            data: 'DSP/Encounter'
          }
        ]
      }
    ]
  },

  'api-connector': {
    name: 'api-connector',
    description: 'Generic API connector for external healthcare systems',
    version: '0.0.1',
    tools: [
      {
        name: 'data-connector',
        description: 'Connects to external APIs to fetch and process healthcare data',
        endpoint: 'https://api.example.com/connector/v1/process',
        inputs: [
          {
            name: 'api-request',
            description: 'API request configuration and parameters',
            data: 'API/Request'
          }
        ],
        outputs: [
          {
            name: 'api-response',
            description: 'Processed API response data',
            data: 'API/Response'
          }
        ]
      },
      {
        name: 'data-transformer',
        description: 'Transforms external data into Dragon Copilot compatible formats',
        endpoint: 'https://api.example.com/connector/transformer/v1/process',
        inputs: [
          {
            name: 'raw-data',
            description: 'Raw data from external systems',
            data: 'Custom/Data'
          }
        ],
        outputs: [
          {
            name: 'transformed-data',
            description: 'Data transformed to DSP format',
            data: 'DSP'
          }
        ]
      }
    ]
  },

  'data-sync': {
    name: 'data-sync',
    description: 'Bidirectional data synchronization between healthcare systems',
    version: '0.0.1',
    tools: [
      {
        name: 'patient-data-sync',
        description: 'Synchronizes patient demographic and clinical data',
        endpoint: 'https://api.example.com/sync/patient/v1/process',
        inputs: [
          {
            name: 'patient',
            description: 'Patient demographic and clinical information',
            data: 'DSP/Patient'
          },
          {
            name: 'encounter',
            description: 'Patient encounter data',
            data: 'DSP/Encounter'
          }
        ],
        outputs: [
          {
            name: 'sync-status',
            description: 'Synchronization status and results',
            data: 'DSP'
          }
        ]
      },
      {
        name: 'clinical-note-sync',
        description: 'Synchronizes clinical notes and documentation',
        endpoint: 'https://api.example.com/sync/notes/v1/process',
        inputs: [
          {
            name: 'note',
            description: 'Clinical note or documentation',
            data: 'DSP/Note'
          },
          {
            name: 'document',
            description: 'Clinical document',
            data: 'DSP/Document'
          }
        ],
        outputs: [
          {
            name: 'sync-result',
            description: 'Note synchronization result',
            data: 'DSP'
          }
        ]
      }
    ]
  },

  'custom': {
    name: 'custom-integration',
    description: 'Custom partner integration template',
    version: '0.0.1',
    tools: [
      {
        name: 'custom-processor',
        description: 'Custom data processing tool',
        endpoint: 'https://api.example.com/custom/v1/process',
        inputs: [
          {
            name: 'input-data',
            description: 'Custom input data',
            data: 'Custom/Data'
          }
        ],
        outputs: [
          {
            name: 'processed-data',
            description: 'Processed data output',
            data: 'DSP'
          }
        ]
      }
    ]
  }
};

export async function getTemplate(templateName: string): Promise<TemplateConfig | null> {
  return templates[templateName] || null;
}

export function listTemplates(): string[] {
  return Object.keys(templates);
}

export function getTemplateDescription(templateName: string): string {
  const template = templates[templateName];
  return template ? template.description : 'Unknown template';
}