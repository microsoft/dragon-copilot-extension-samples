import { describe, expect, it } from '@jest/globals';
import yaml from 'js-yaml';
import {
  DEFAULT_OUTPUT_CONTENT_TYPE,
  DEFAULT_PAYLOAD_SCHEMA_VERSION,
  MANIFEST_DEFAULTS,
  PATIENT_INFORMATION_CONTENT_TYPE,
  REPORT_CONTENT_TYPE,
  buildManifest,
  buildManifestFromTemplate,
  buildTool,
  getTemplate,
  listTemplateSummaries,
  listTemplates,
  normalizeRelevanceFilteringCriteria,
  renderManifestYaml,
} from '../domains/radiologists/manifest/index.js';
import { validateDcrExtensionManifest } from '../shared/schema-validator.js';
import type { DcrExtensionManifest } from '../domains/radiologists/types.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * The manifest core is shared verbatim with the Extensions Sandbox server, which
 * generates manifests from form input rather than prompts. These tests pin the
 * behaviour both surfaces depend on: schema-valid output, defaults applied, and
 * templates handed out as copies.
 */
describe('radiologists manifest builder', () => {
  it('builds a schema-valid manifest from collected answers', () => {
    const manifest = buildManifest({
      extension: {
        name: 'myRadiologistsExtension',
        description: 'A Dragon Copilot radiologists extension',
        version: '0.0.1',
        radiologistsExtensibilityApiVersion: '1.0.0',
      },
      auth: { tenantId: TENANT_ID },
      tools: [
        {
          name: 'myRadiologistsTool',
          description: 'Processes radiology reports',
          endpoint: 'https://api.example.com/radiologists/v1/process',
          inputTypes: [REPORT_CONTENT_TYPE, PATIENT_INFORMATION_CONTENT_TYPE],
          outputs: [{ name: 'qualityCheckResult', description: 'Quality check result' }],
        },
      ],
    });

    const result = validateDcrExtensionManifest(manifest);
    expect(result.errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('derives input names, descriptions, and schema versions from content types', () => {
    const tool = buildTool({
      name: 'myRadiologistsTool',
      description: 'Processes radiology reports',
      endpoint: 'https://api.example.com/radiologists/v1/process',
      inputTypes: [REPORT_CONTENT_TYPE, PATIENT_INFORMATION_CONTENT_TYPE],
      outputs: [{ name: 'qualityCheckResult', description: 'Quality check result' }],
    });

    expect(tool.inputs).toEqual([
      {
        name: 'report',
        description: 'Radiology report from Dragon Copilot',
        'content-type': REPORT_CONTENT_TYPE,
        schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION,
      },
      {
        name: 'patientInformation',
        description: 'Patient demographic information from Dragon Copilot',
        'content-type': PATIENT_INFORMATION_CONTENT_TYPE,
        schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION,
      },
    ]);
  });

  it('applies tool type, capability, and output defaults', () => {
    const tool = buildTool({
      name: 'myRadiologistsTool',
      description: 'Processes radiology reports',
      endpoint: 'https://api.example.com/radiologists/v1/process',
      inputTypes: [REPORT_CONTENT_TYPE],
      outputs: [{ name: 'qualityCheckResult', description: 'Quality check result' }],
    });

    expect(tool.toolType).toBe('contractBased');
    expect(tool.capability).toBe('qualityCheck');
    expect(tool.outputs[0]).toEqual({
      name: 'qualityCheckResult',
      description: 'Quality check result',
      'content-type': DEFAULT_OUTPUT_CONTENT_TYPE,
      schemaVersion: DEFAULT_PAYLOAD_SCHEMA_VERSION,
    });
  });

  it('keeps relevance filtering criteria when supplied and omits it when empty', () => {
    const filtered = buildTool({
      name: 'myRadiologistsTool',
      description: 'Processes radiology reports',
      endpoint: 'https://api.example.com/radiologists/v1/process',
      inputTypes: [REPORT_CONTENT_TYPE],
      outputs: [{ name: 'qualityCheckResult', description: 'Quality check result' }],
      relevanceFilteringCriteria: { relevantBodyParts: ['CHEST'], relevantModalities: [] },
    });

    expect(filtered.relevanceFilteringCriteria).toEqual({ relevantBodyParts: ['CHEST'] });

    const unfiltered = buildTool({
      name: 'myRadiologistsTool',
      description: 'Processes radiology reports',
      endpoint: 'https://api.example.com/radiologists/v1/process',
      inputTypes: [REPORT_CONTENT_TYPE],
      outputs: [{ name: 'qualityCheckResult', description: 'Quality check result' }],
      relevanceFilteringCriteria: { relevantBodyParts: [], relevantModalities: [] },
    });

    expect('relevanceFilteringCriteria' in unfiltered).toBe(false);
    expect(normalizeRelevanceFilteringCriteria(null)).toBeUndefined();
  });

  it('builds a schema-valid manifest from the quality-check template', () => {
    const manifest = buildManifestFromTemplate('quality-check', { tenantId: TENANT_ID });

    expect(manifest.name).toBe('sampleQualityCheckExtension');
    expect(manifest.auth.tenantId).toBe(TENANT_ID);
    expect(validateDcrExtensionManifest(manifest).isValid).toBe(true);
  });

  it('hands out template copies so generated manifests cannot mutate the registry', () => {
    const first = buildManifestFromTemplate('quality-check', { tenantId: TENANT_ID });
    first.tools[0]!.name = 'mutatedToolName';
    first.tools[0]!.relevanceFilteringCriteria!.relevantBodyParts!.push('ABDOMEN');

    const second = buildManifestFromTemplate('quality-check', { tenantId: TENANT_ID });

    expect(second.tools[0]!.name).toBe('sampleQualityCheckTool');
    expect(second.tools[0]!.relevanceFilteringCriteria!.relevantBodyParts).toEqual(['CHEST']);
    expect(getTemplate('quality-check').tools[0]!.name).toBe('sampleQualityCheckTool');
  });

  it('reports unknown templates with the available names', () => {
    expect(() => buildManifestFromTemplate('does-not-exist', { tenantId: TENANT_ID })).toThrow(
      /Available templates: quality-check/,
    );
  });

  it('treats inherited object keys as unknown template names', () => {
    // Template names reach `getTemplate` from a request body in the Extensions
    // Sandbox, so a bare property lookup would let '__proto__' or 'constructor'
    // resolve to something that is not a template.
    for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(() => getTemplate(name)).toThrow(/Available templates: quality-check/);
      expect(() => buildManifestFromTemplate(name, { tenantId: TENANT_ID })).toThrow(
        /Available templates: quality-check/,
      );
    }
  });

  it('summarizes templates for selection UIs', () => {
    expect(listTemplates()).toContain('quality-check');
    expect(listTemplateSummaries()).toEqual([
      {
        id: 'quality-check',
        name: 'sampleQualityCheckExtension',
        description: 'Extension to provide radiology report quality checking',
        version: '0.0.1',
        toolCount: 1,
      },
    ]);
  });

  it('renders YAML that round-trips back to the same manifest', () => {
    const manifest = buildManifestFromTemplate('quality-check', { tenantId: TENANT_ID });

    const rendered = renderManifestYaml(manifest);

    expect(rendered).toContain('name: sampleQualityCheckExtension');
    expect(yaml.load(rendered) as DcrExtensionManifest).toEqual(manifest);
  });

  it('exposes the defaults the CLI prompts and the sandbox wizard pre-fill', () => {
    expect(MANIFEST_DEFAULTS.extensionName).toBe('myRadiologistsExtension');
    expect(MANIFEST_DEFAULTS.radiologistsExtensibilityApiVersion).toBe('1.0.0');
    expect(MANIFEST_DEFAULTS.schemaVersion).toBe(DEFAULT_PAYLOAD_SCHEMA_VERSION);
  });
});
