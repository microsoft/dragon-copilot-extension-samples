import { describe, it, expect } from 'vitest';
import { mapPathsToLines } from '../utils/source-mapper.js';

describe('mapPathsToLines', () => {
  const yamlSource = `name: my-extension
description: A sample extension
version: 1.0.0
auth:
  tenantId: 12345678-1234-1234-1234-123456789abc
tools:
  - name: my-tool
    toolType: contractBased
    capability: qualityCheck
    description: A quality check tool
    endpoint: https://api.example.com/v1/process
    inputs:
      - name: report
        description: Report input
        content-type: application/vnd.ms-dragon.dsp.rad.report+json
    outputs:
      - name: result
        description: Result output
        content-type: application/vnd.ms-dragon.dsp.rad.quality-result+json
`;

  const jsonSource = `{
  "name": "my-extension",
  "description": "A sample extension",
  "version": "1.0.0",
  "auth": {
    "tenantId": "12345678-1234-1234-1234-123456789abc"
  },
  "tools": [
    {
      "name": "my-tool",
      "toolType": "contractBased",
      "capability": "qualityCheck",
      "description": "A quality check tool",
      "endpoint": "https://api.example.com/v1/process",
      "inputs": [
        {
          "name": "report",
          "description": "Report input",
          "content-type": "application/vnd.ms-dragon.dsp.rad.report+json"
        }
      ],
      "outputs": [
        {
          "name": "result",
          "description": "Result output",
          "content-type": "application/vnd.ms-dragon.dsp.rad.quality-result+json"
        }
      ]
    }
  ]
}`;

  it('should resolve top-level YAML keys to their exact lines', () => {
    const result = mapPathsToLines(yamlSource, ['/name', '/version', '/description']);
    expect(result.get('/name')).toBe(1);
    expect(result.get('/version')).toBe(3);
    expect(result.get('/description')).toBe(2);
  });

  it('should resolve nested YAML keys to their exact lines', () => {
    const result = mapPathsToLines(yamlSource, ['/auth/tenantId']);
    expect(result.get('/auth/tenantId')).toBe(5);
  });

  it('should resolve tool properties in YAML to exact lines', () => {
    const result = mapPathsToLines(yamlSource, [
      '/tools/0/name',
      '/tools/0/toolType',
      '/tools/0/endpoint',
    ]);
    expect(result.get('/tools/0/name')).toBe(7);
    expect(result.get('/tools/0/toolType')).toBe(8);
    expect(result.get('/tools/0/endpoint')).toBe(11);
  });

  it('should resolve top-level JSON keys to their exact lines', () => {
    const result = mapPathsToLines(jsonSource, ['/name', '/version']);
    expect(result.get('/name')).toBe(2);
    expect(result.get('/version')).toBe(4);
  });

  it('should resolve nested JSON keys to their exact lines', () => {
    const result = mapPathsToLines(jsonSource, ['/auth/tenantId']);
    expect(result.get('/auth/tenantId')).toBe(6);
  });

  it('should resolve tool properties in JSON to exact lines', () => {
    const result = mapPathsToLines(jsonSource, [
      '/tools/0/name',
      '/tools/0/toolType',
      '/tools/0/endpoint',
    ]);
    expect(result.get('/tools/0/name')).toBe(10);
    expect(result.get('/tools/0/toolType')).toBe(11);
    expect(result.get('/tools/0/endpoint')).toBe(14);
  });

  it('should fall back to parent line for a missing property', () => {
    // If we look for a property that doesn't exist, we get the deepest resolved parent
    const result = mapPathsToLines(yamlSource, ['/tools/0/nonExistent']);
    const line = result.get('/tools/0/nonExistent');
    // Should resolve to the array item line (line 7, the "- name: my-tool" line)
    expect(line).toBe(7);
  });

  it('should resolve root path to line 1', () => {
    const result = mapPathsToLines(yamlSource, ['/']);
    expect(result.get('/')).toBe(1);
  });
});
