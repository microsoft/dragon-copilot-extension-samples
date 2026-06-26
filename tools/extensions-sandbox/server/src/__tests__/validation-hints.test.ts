import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { buildDetailedErrors } from '../utils/validation-hints.js';
import { MANIFEST_SCHEMA_PATH } from '../utils/schema-path.js';

const manifestJsonSchema = JSON.parse(readFileSync(MANIFEST_SCHEMA_PATH, 'utf-8'));

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(manifestJsonSchema);

describe('buildDetailedErrors', () => {
  it('should provide hints for missing top-level required properties', () => {
    validate({});
    const errors = buildDetailedErrors(validate.errors!);

    const nameError = errors.find((e) => e.detail.includes("'name'"));
    expect(nameError).toBeDefined();
    expect(nameError!.hint).toContain('kebab-case');

    const authError = errors.find((e) => e.detail.includes("'auth'"));
    expect(authError).toBeDefined();
    expect(authError!.hint).toContain('tenantId');

    const toolsError = errors.find((e) => e.detail.includes("'tools'"));
    expect(toolsError).toBeDefined();
    expect(toolsError!.hint).toContain('tool definition');
  });

  it('should provide hints for missing tool-level required properties', () => {
    const manifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: '12345678-1234-1234-1234-123456789abc' },
      tools: [{ name: 'my-tool', description: 'A tool' }],
    };
    validate(manifest);
    const errors = buildDetailedErrors(validate.errors!);

    const toolTypeError = errors.find((e) => e.detail.includes("'toolType'"));
    expect(toolTypeError).toBeDefined();
    expect(toolTypeError!.hint).toContain('contractBased');

    const capabilityError = errors.find((e) => e.detail.includes("'capability'"));
    expect(capabilityError).toBeDefined();
    expect(capabilityError!.hint).toContain('qualityCheck');
  });

  it('should provide hints for invalid enum values', () => {
    const manifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: '12345678-1234-1234-1234-123456789abc' },
      tools: [
        {
          name: 'tool',
          toolType: 'invalidType',
          capability: 'invalidCap',
          description: 'A tool',
          endpoint: 'https://api.example.com/v1/process',
          inputs: [
            { name: 'note', description: 'Note', 'content-type': 'application/json', schemaVersion: '0.1' },
          ],
          outputs: [
            { name: 'result', description: 'Result', 'content-type': 'text/plain', schemaVersion: '0.1' },
          ],
        },
      ],
    };
    validate(manifest);
    const errors = buildDetailedErrors(validate.errors!);

    const toolTypeErr = errors.find((e) => e.path.includes('toolType'));
    expect(toolTypeErr).toBeDefined();
    expect(toolTypeErr!.hint).toContain('contractBased');

    const capErr = errors.find((e) => e.path.includes('capability'));
    expect(capErr).toBeDefined();
    expect(capErr!.hint).toContain('qualityCheck');

    const contentTypeErr = errors.find((e) => e.path.includes('content-type') && e.path.includes('inputs'));
    expect(contentTypeErr).toBeDefined();
    expect(contentTypeErr!.hint).toContain('application/vnd.ms-dragon.rad');
  });

  it('should provide hints for pattern validation failures', () => {
    const manifest = {
      name: 'Invalid Name!',
      description: 'Test',
      version: 'abc',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: 'not-a-guid' },
      tools: [
        {
          name: 'my-tool',
          toolType: 'contractBased',
          capability: 'qualityCheck',
          description: 'A tool',
          endpoint: 'https://api.example.com/v1/process',
          inputs: [
            { name: 'report', description: 'Report', 'content-type': 'application/vnd.ms-dragon.rad.report+json', schemaVersion: '0.1' },
          ],
          outputs: [
            { name: 'result', description: 'Result', 'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json', schemaVersion: '0.1' },
          ],
        },
      ],
    };
    validate(manifest);
    const errors = buildDetailedErrors(validate.errors!);

    const nameErr = errors.find((e) => e.path === '/name');
    expect(nameErr).toBeDefined();
    expect(nameErr!.hint).toContain('camelCase');
    expect(nameErr!.hint).toContain('lowercase letter');

    const versionErr = errors.find((e) => e.path === '/version');
    expect(versionErr).toBeDefined();
    expect(versionErr!.hint).toContain('MAJOR.MINOR.PATCH');

    const tenantErr = errors.find((e) => e.path === '/auth/tenantId');
    expect(tenantErr).toBeDefined();
    expect(tenantErr!.hint).toContain('UUID');
  });

  it('should provide hints for invalid URI format', () => {
    const manifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      radiologistsExtensibilityApiVersion: '0.1.0',
      auth: { tenantId: '12345678-1234-1234-1234-123456789abc' },
      tools: [
        {
          name: 'tool',
          toolType: 'contractBased',
          capability: 'qualityCheck',
          description: 'A tool',
          endpoint: 'not-a-url',
          inputs: [
            { name: 'report', description: 'Report', 'content-type': 'application/vnd.ms-dragon.rad.report+json', schemaVersion: '0.1' },
          ],
          outputs: [
            { name: 'result', description: 'Result', 'content-type': 'application/vnd.ms-dragon.rad.quality-check-result+json', schemaVersion: '0.1' },
          ],
        },
      ],
    };
    validate(manifest);
    const errors = buildDetailedErrors(validate.errors!);

    const uriErr = errors.find((e) => e.path.includes('endpoint'));
    expect(uriErr).toBeDefined();
    expect(uriErr!.hint).toContain('https://');
  });

  it('should include all fields: path, message, detail, hint, severity', () => {
    validate({});
    const errors = buildDetailedErrors(validate.errors!);

    for (const err of errors) {
      expect(err).toHaveProperty('path');
      expect(err).toHaveProperty('message');
      expect(err).toHaveProperty('detail');
      expect(err).toHaveProperty('hint');
      expect(err.severity).toBe('error');
      expect(err.detail.length).toBeGreaterThan(0);
      expect(err.hint.length).toBeGreaterThan(0);
    }
  });
});
