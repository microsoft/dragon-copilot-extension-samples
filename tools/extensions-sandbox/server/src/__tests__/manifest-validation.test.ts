import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { MANIFEST_SCHEMA_PATH } from '../utils/schema-path.js';

const manifestJsonSchema = JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, 'utf-8'));

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(manifestJsonSchema);

const fixturesDir = resolve(__dirname, 'fixtures');
const validManifestSimple = JSON.parse(readFileSync(resolve(fixturesDir, 'valid-manifest-simple.json'), 'utf-8'));
const validManifestFullFeatured = JSON.parse(readFileSync(resolve(fixturesDir, 'valid-manifest-full-featured.json'), 'utf-8'));

describe('Manifest Schema Validation', () => {
  it('should validate a conforming radiology extension manifest as valid', () => {
    const isValid = validate(validManifestSimple);

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
              'content-type': 'application/vnd.ms-dragon.rad.report+json',
            },
          ],
          outputs: [
            {
              name: 'result',
              description: 'Result output',
              'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json',
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
              'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json',
            },
          ],
        },
      ],
    };

    const isValid = validate(manifest);
    expect(isValid).toBe(false);
  });

  it('should validate optional fields like configurationTemplate and input config', () => {
    const isValid = validate(validManifestFullFeatured);

    if (!isValid) {
      console.error('Validation errors:', JSON.stringify(validate.errors, null, 2));
    }

    expect(isValid).toBe(true);
    expect(validate.errors).toBeNull();
  });
});
