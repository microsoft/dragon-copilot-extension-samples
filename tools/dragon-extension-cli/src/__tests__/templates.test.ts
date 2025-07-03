import { getTemplate, listTemplates } from '../templates/index.js';

describe('Templates', () => {
  test('should list available templates', () => {
    const templates = listTemplates();

    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates).toContain('note-analysis');
    expect(templates).toContain('speech-analysis');
  });

  test('should get note-analysis template', () => {
    const template = getTemplate('note-analysis');

    expect(template.name).toBe('my-note-analysis-extension');
    expect(template.description).toBe('Provides note analysis');
    expect(template.version).toBe('0.0.1');
    expect(template.tools).toHaveLength(1);
    expect(template.tools[0].name).toBe('note-analyzer');
  });

  test('should get speech-analysis template', () => {
    const template = getTemplate('speech-analysis');

    expect(template.name).toBe('my-speech-extension');
    expect(template.description).toBe('Provides speech analysis');
    expect(template.version).toBe('0.0.1');
    expect(template.tools).toHaveLength(1);
    expect(template.tools[0].name).toBe('speech-analysis');
  });

  test('should throw error for non-existent template', () => {
    expect(() => {
      getTemplate('non-existent-template');
    }).toThrow('Template \'non-existent-template\' not found');
  });
});
