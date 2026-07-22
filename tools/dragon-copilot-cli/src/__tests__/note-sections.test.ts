import { describe, expect, test } from '@jest/globals';
import { normalizeNoteSections } from '../domains/connector/shared/note-sections.js';

describe('normalizeNoteSections', () => {
  test('preserves plan when normalizing manifest note-sections', () => {
    const normalized = normalizeNoteSections({
      assessment: ['assessment', 'plan'],
      plan: 'plan'
    });

    expect(normalized.plan).toBe('plan');
  });
});
