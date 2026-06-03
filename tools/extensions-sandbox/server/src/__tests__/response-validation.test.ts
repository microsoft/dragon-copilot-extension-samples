import { describe, it, expect, beforeEach } from 'vitest';
import { validateToolResponse } from '../services/validation.js';
import { sessionStore } from '../store/session.js';
import type { ExtensionManifest } from '../schemas/manifest.schema.js';

/** A minimal valid manifest for testing the validation engine. */
function loadTestManifest(): void {
  const manifest: ExtensionManifest = {
    name: 'test-extension',
    description: 'Extension for validation tests',
    version: '1.0.0',
    auth: { tenantId: '00000000-0000-0000-0000-000000000000' },
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
      },
    ],
  };
  sessionStore.setManifest(manifest);
}

describe('Schema Validation Engine', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  // ─── No manifest / tool not found ─────────────────────────────────────

  it('should fail when no manifest is loaded', () => {
    const result = validateToolResponse('chest-ct-quality', {});
    expect(result.valid).toBe(false);
    expect(result.checks[0].error).toContain('No manifest loaded');
  });

  it('should fail when tool is not found in manifest', () => {
    loadTestManifest();
    const result = validateToolResponse('non-existent-tool', {});
    expect(result.valid).toBe(false);
    expect(result.checks[0].error).toContain("Tool 'non-existent-tool' not found");
    expect(result.checks[0].error).toContain('chest-ct-quality');
  });

  // ─── Valid payloads ────────────────────────────────────────────────────

  it('should pass a valid QualityCheckResult', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        {
          qualityCheckType: 'Clinical',
          description: 'Consider adding comparison with prior studies',
          reason: 'No comparison section found in report',
          severityScorePercent: 40,
        },
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);

    expect(result.valid).toBe(true);
    expect(result.toolName).toBe('chest-ct-quality');
    expect(result.outputContentType).toBe('application/vnd.ms-dragon.dsp.rad.quality-result+json');
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.passed).toBeGreaterThan(0);
  });

  it('should pass when recommendations is an empty array', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', { recommendations: [] });
    expect(result.valid).toBe(true);
  });

  it('should pass with multiple valid recommendations', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        { qualityCheckType: 'Clinical', description: 'Check A', reason: 'Reason A' },
        { qualityCheckType: 'Billing', description: 'Check B', reason: 'Reason B', severityScorePercent: 0 },
        { qualityCheckType: 'Clinical', description: 'Check C', reason: 'Reason C', severityScorePercent: 100 },
      ],
    };
    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(true);
  });

  // ─── Missing required fields ───────────────────────────────────────────

  it('should fail when top-level recommendations is missing', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', {});

    expect(result.valid).toBe(false);
    const failedChecks = result.checks.filter((c) => !c.passed);
    expect(failedChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          passed: false,
          error: expect.stringContaining("'recommendations'"),
        }),
      ]),
    );
  });

  it('should fail when required fields are missing from a recommendation', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        { qualityCheckType: 'Clinical', description: 'Some check' },
        // missing 'reason'
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const failedChecks = result.checks.filter((c) => !c.passed);
    expect(failedChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          error: expect.stringContaining("'reason'"),
        }),
      ]),
    );
  });

  // ─── Enum violations ───────────────────────────────────────────────────

  it('should fail when qualityCheckType has invalid enum value', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        { qualityCheckType: 'Spelling', description: 'Check', reason: 'Bad type' },
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);

    const enumCheck = result.checks.find((c) => c.error?.includes('Spelling'));
    expect(enumCheck).toBeDefined();
    expect(enumCheck!.error).toContain('not one of');
    expect(enumCheck!.error).toContain('Billing');
    expect(enumCheck!.error).toContain('Clinical');
  });

  // ─── Type violations ──────────────────────────────────────────────────

  it('should fail when a field has wrong type', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        {
          qualityCheckType: 'Clinical',
          description: 123, // should be string
          reason: 'Test',
        },
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const typeCheck = result.checks.find((c) => c.error?.includes("Expected type"));
    expect(typeCheck).toBeDefined();
    expect(typeCheck!.error).toContain("'string'");
  });

  it('should fail when recommendations is not an array', () => {
    loadTestManifest();
    const payload = { recommendations: 'not-an-array' };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const typeCheck = result.checks.find((c) => c.error?.includes("Expected type"));
    expect(typeCheck).toBeDefined();
    expect(typeCheck!.error).toContain("'array'");
  });

  // ─── Range violations ─────────────────────────────────────────────────

  it('should fail when severityScorePercent exceeds maximum', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        { qualityCheckType: 'Clinical', description: 'Check', reason: 'Test', severityScorePercent: 150 },
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const rangeCheck = result.checks.find((c) => c.error?.includes('maximum'));
    expect(rangeCheck).toBeDefined();
    expect(rangeCheck!.error).toContain('100');
  });

  it('should fail when severityScorePercent is below minimum', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        { qualityCheckType: 'Clinical', description: 'Check', reason: 'Test', severityScorePercent: -5 },
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const rangeCheck = result.checks.find((c) => c.error?.includes('minimum'));
    expect(rangeCheck).toBeDefined();
  });

  // ─── Additional properties ─────────────────────────────────────────────

  it('should fail when unexpected properties are present', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        { qualityCheckType: 'Clinical', description: 'Check', reason: 'Test' },
      ],
      totallyUnexpected: true,
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const extraCheck = result.checks.find((c) => c.error?.includes('totallyUnexpected'));
    expect(extraCheck).toBeDefined();
    expect(extraCheck!.error).toContain('Unexpected property');
  });

  // ─── Null / edge cases ─────────────────────────────────────────────────

  it('should fail when response payload is null', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', null);
    expect(result.valid).toBe(false);
    expect(result.checks[0].error).toContain('null');
  });

  it('should fail when response payload is undefined', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', undefined);
    expect(result.valid).toBe(false);
    expect(result.checks[0].error).toContain('null');
  });

  it('should fail when response payload is an array', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', [1, 2, 3]);
    expect(result.valid).toBe(false);
    expect(result.checks[0].error).toContain('array');
  });

  it('should fail when response payload is a string', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', 'not an object');
    expect(result.valid).toBe(false);
    expect(result.checks[0].error).toContain('string');
  });

  // ─── Multiple errors collected ─────────────────────────────────────────

  it('should collect multiple errors in one validation', () => {
    loadTestManifest();
    const payload = {
      recommendations: [
        {
          qualityCheckType: 'Spelling', // bad enum
          // missing description
          // missing reason
          severityScorePercent: 200, // over max
        },
      ],
    };

    const result = validateToolResponse('chest-ct-quality', payload);
    expect(result.valid).toBe(false);
    const failedChecks = result.checks.filter((c) => !c.passed);
    expect(failedChecks.length).toBeGreaterThanOrEqual(3);
  });

  // ─── Timestamp and metadata ────────────────────────────────────────────

  it('should include timestamp in ISO format', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', { recommendations: [] });
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should include summary counts', () => {
    loadTestManifest();
    const result = validateToolResponse('chest-ct-quality', { recommendations: [] });
    expect(result.summary.passed).toBeGreaterThan(0);
    expect(result.summary.failed).toBe(0);
  });
});

describe('Session Store – Validation Results', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('should store validation results in session', () => {
    loadTestManifest();
    validateToolResponse('chest-ct-quality', { recommendations: [] });
    const stored = sessionStore.getValidationResults();
    // Results are stored via the route handler, not the service directly.
    // This test verifies the store API works.
    sessionStore.addValidationResult(
      validateToolResponse('chest-ct-quality', { recommendations: [] }),
    );
    const results = sessionStore.getValidationResults();
    expect(results.length).toBe(1);
    expect(results[0].toolName).toBe('chest-ct-quality');
  });

  it('should accumulate multiple validation results', () => {
    loadTestManifest();
    sessionStore.addValidationResult(
      validateToolResponse('chest-ct-quality', { recommendations: [] }),
    );
    sessionStore.addValidationResult(
      validateToolResponse('chest-ct-quality', {}),
    );
    const results = sessionStore.getValidationResults();
    expect(results.length).toBe(2);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
  });

  it('should clear validation results when a new manifest is loaded', () => {
    loadTestManifest();
    sessionStore.addValidationResult(
      validateToolResponse('chest-ct-quality', { recommendations: [] }),
    );
    expect(sessionStore.getValidationResults().length).toBe(1);

    // Re-load manifest — should clear results
    loadTestManifest();
    expect(sessionStore.getValidationResults().length).toBe(0);
  });

  it('should clear validation results explicitly', () => {
    loadTestManifest();
    sessionStore.addValidationResult(
      validateToolResponse('chest-ct-quality', { recommendations: [] }),
    );
    sessionStore.clearValidationResults();
    expect(sessionStore.getValidationResults().length).toBe(0);
  });

  it('should return a copy of results (not a reference)', () => {
    loadTestManifest();
    sessionStore.addValidationResult(
      validateToolResponse('chest-ct-quality', { recommendations: [] }),
    );
    const results = sessionStore.getValidationResults();
    results.push(validateToolResponse('chest-ct-quality', {}));
    // Original store should not be affected
    expect(sessionStore.getValidationResults().length).toBe(1);
  });
});
