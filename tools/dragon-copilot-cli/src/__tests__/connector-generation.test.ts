import { describe, expect, test } from '@jest/globals';
import { getTemplate, listTemplates } from '../domains/connector/templates/index.js';
import { dumpManifestYaml } from '../domains/connector/shared/yaml.js';

describe('connector manifest generation', () => {
  test.each(listTemplates())('%s template includes publisher-name and omits note-sections', async templateName => {
    const template = await getTemplate(templateName);

    expect(template).not.toBeNull();
    expect(template?.manifest['publisher-name']).toBe('Sample Partner, Inc.');
    expect(template?.manifest).not.toHaveProperty('note-sections');

    const yaml = dumpManifestYaml(template?.manifest);
    expect(yaml).toContain('publisher-name: Sample Partner, Inc.');
    expect(yaml).not.toContain('Human-readable publisher display name');
    expect(yaml).not.toContain('note-sections:');
  });
});
