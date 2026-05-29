import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schemaPath = resolve(__dirname, '..', 'schemas', 'extension-manifest.json');
const manifestJsonSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(manifestJsonSchema);

describe('Manifest Schema Validation', () => {
  it('should validate a conforming radiology extension manifest as valid', () => {
    const manifest = {
      name: 'sample-quality-check',
      description: 'Sample radiology quality check extension',
      version: '0.0.1',
      auth: {
        tenantId: '00000000-0000-0000-0000-000000000000',
      },
      tools: [
        {
          name: 'chest-ct-quality',
          toolType: 'contractBased',
          capability: 'qualityCheck',
          description: 'Quality check for chest CT reports',
          endpoint: 'https://api.example.com/v1/process',
          inputs: [
            {
              name: 'report',
              description: 'Radiology report',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json',
            },
          ],
          outputs: [
            {
              name: 'quality-result',
              description: 'Quality check findings',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json',
            },
          ],
          relevanceFilteringCriteria: {
            relevantBodyParts: ['CHEST'],
            relevantModalities: ['CT'],
          },
        },
      ],
    };

    const isValid = validate(manifest);

    if (!isValid) {
      console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
    }

    expect(isValid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('should reject a manifest missing required tool fields', () => {
    const manifest = {
      name: 'bad-extension',
      description: 'Missing toolType and capability',
      version: '1.0.0',
      auth: {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      },
      tools: [
        {
          name: 'incomplete-tool',
          description: 'Tool without toolType/capability',
          endpoint: 'https://api.example.com/v1/process',
          inputs: [
            {
              name: 'report',
              description: 'Report input',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json',
            },
          ],
          outputs: [
            {
              name: 'result',
              description: 'Result output',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json',
            },
          ],
        },
      ],
    };

    const isValid = validate(manifest);
    expect(isValid).toBe(false);
    expect(validate.errors).not.toBeNull();
    // Verify errors reference the missing fields
    const errorMessages = validate.errors!.map((e) => e.params);
    expect(errorMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ missingProperty: 'toolType' }),
        expect.objectContaining({ missingProperty: 'capability' }),
      ]),
    );
  });

  it('should reject an invalid content-type', () => {
    const manifest = {
      name: 'bad-content-type',
      description: 'Uses invalid content-type',
      version: '1.0.0',
      auth: {
        tenantId: '12345678-1234-1234-1234-123456789abc',
      },
      tools: [
        {
          name: 'bad-tool',
          toolType: 'contractBased',
          capability: 'qualityCheck',
          description: 'Tool with bad content-type',
          endpoint: 'https://api.example.com/v1/process',
          inputs: [
            {
              name: 'note',
              description: 'Note input',
              'content-type': 'application/vnd.ms-dragon.dsp.note+json',
            },
          ],
          outputs: [
            {
              name: 'result',
              description: 'Result',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json',
            },
          ],
        },
      ],
    };

    const isValid = validate(manifest);
    expect(isValid).toBe(false);
  });

  it('should validate optional fields like configurationTemplate and input config', () => {
    const manifest = {
      name: 'full-featured-extension',
      description: 'Extension using all optional fields',
      version: '2.1.0',
      auth: {
        tenantId: 'aabbccdd-1122-3344-5566-778899aabbcc',
      },
      tools: [
        {
          name: 'brain-mri-report',
          toolType: 'contractBased',
          capability: 'reportGeneration',
          description: 'Generates brain MRI reports',
          endpoint: 'https://api.example.com/v1/process',
          inputs: [
            {
              name: 'report',
              description: 'Current radiology report',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.report+json',
              required: true,
              config: {
                minNumberOfPriors: 1,
                maxNumberOfPriors: 5,
                relevantBodyParts: ['BRAIN'],
                relevantModalities: ['MR'],
              },
            },
            {
              name: 'patient-info',
              description: 'Patient demographics',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.patient-info+json',
              required: false,
            },
          ],
          outputs: [
            {
              name: 'quality-result',
              description: 'Report quality findings',
              'content-type': 'application/vnd.ms-dragon.dsp.rad.quality-result+json',
            },
          ],
          relevanceFilteringCriteria: {
            relevantBodyParts: ['BRAIN'],
            relevantModalities: ['MR'],
          },
          configurationTemplate: {
            type: 'object',
            properties: {
              language: { type: 'string', default: 'en' },
            },
          },
        },
      ],
    };

    const isValid = validate(manifest);

    if (!isValid) {
      console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
    }

    expect(isValid).toBe(true);
    expect(validate.errors).toBeNull();
  });
});
