import { describe, expect, it } from 'vitest';
import {
  buildExtensionApiPreview,
  humanizeKey,
  isAdaptiveCard,
  toRecommendations,
} from '../extension-api-provider';
import {
  buildPreview,
  getResultProvider,
  listResultProviders,
  registerResultProvider,
} from '../registry';
import type { PreviewModel, ResultProvider } from '../types';

const recommendationResult = {
  status: 200,
  processResponse: {
    success: true,
    message: 'Payload processed successfully.',
    payload: {
      'quality-result': {
        recommendations: [
          {
            qualityCheckType: 'Clinical',
            description: 'Consider adding comparison with prior studies',
            reason: 'No comparison section found in report',
            severityScorePercent: 40,
          },
        ],
      },
    },
  },
};

const cardResult = {
  status: 200,
  processResponse: {
    success: true,
    payload: {
      summaryCard: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [{ type: 'TextBlock', text: 'Follow-up imaging recommended' }],
      },
    },
  },
};

describe('humanizeKey', () => {
  it('reads both kebab-case and camelCase payload keys', () => {
    expect(humanizeKey('quality-result')).toBe('Quality Result');
    expect(humanizeKey('qualityCheckResult')).toBe('Quality Check Result');
  });
});

describe('isAdaptiveCard', () => {
  it('identifies a card by its type discriminator', () => {
    expect(isAdaptiveCard({ type: 'AdaptiveCard' })).toBe(true);
    expect(isAdaptiveCard({ type: 'Something' })).toBe(false);
    expect(isAdaptiveCard('AdaptiveCard')).toBe(false);
    expect(isAdaptiveCard(null)).toBe(false);
  });
});

describe('toRecommendations', () => {
  it('normalizes the wrapped and bare shapes', () => {
    const item = { qualityCheckType: 'Billing', description: 'Add modifier', reason: 'Bilateral' };
    expect(toRecommendations({ recommendations: [item] })).toEqual([item]);
    expect(toRecommendations([item])).toEqual([item]);
  });

  it('keeps an empty recommendation list as an empty list, not a miss', () => {
    expect(toRecommendations({ recommendations: [] })).toEqual([]);
  });

  it('drops unknown numeric and object fields instead of passing them through', () => {
    const result = toRecommendations({
      recommendations: [
        {
          qualityCheckType: 'Clinical',
          description: 'Check',
          reason: 'Reason',
          severityScorePercent: Number.NaN,
          additionalInfo: { note: 'keep', dropped: 5 },
          provenance: [{ text: 'section' }],
        },
      ],
    });

    expect(result).toEqual([
      {
        qualityCheckType: 'Clinical',
        description: 'Check',
        reason: 'Reason',
        additionalInfo: { note: 'keep' },
      },
    ]);
  });

  it('rejects shapes that are not recommendations', () => {
    expect(toRecommendations({ recommendations: [{ reason: 'no description' }] })).toBeNull();
    expect(toRecommendations({ findings: [] })).toBeNull();
    expect(toRecommendations('nope')).toBeNull();
  });
});

describe('buildExtensionApiPreview', () => {
  it('returns null when there is no result to preview', () => {
    expect(buildExtensionApiPreview(null)).toBeNull();
    expect(buildExtensionApiPreview(undefined)).toBeNull();
    expect(buildExtensionApiPreview({})).toBeNull();
    expect(buildExtensionApiPreview({ processResponse: null, rawBody: '' })).toBeNull();
  });

  it('builds a recommendations block plus the status message', () => {
    const model = buildExtensionApiPreview({ ...recommendationResult, toolName: 'qualityTool' });

    expect(model).not.toBeNull();
    expect(model?.source).toBe('extension-api');
    expect(model?.producedBy).toBe('qualityTool');
    expect(model?.blocks[0]).toEqual({
      kind: 'message',
      tone: 'success',
      text: 'Payload processed successfully.',
    });
    expect(model?.blocks[1]).toMatchObject({
      kind: 'recommendations',
      title: 'Quality Result',
      recommendations: [{ description: 'Consider adding comparison with prior studies', severityScorePercent: 40 }],
    });
  });

  it('builds an adaptive-card block for card payloads', () => {
    const model = buildExtensionApiPreview(cardResult);

    expect(model?.blocks).toHaveLength(1);
    expect(model?.blocks[0]).toMatchObject({ kind: 'adaptive-card', title: 'Summary Card' });
  });

  it('unwraps a card carried in a content-type envelope', () => {
    const model = buildExtensionApiPreview({
      processResponse: {
        payload: {
          card: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: { type: 'AdaptiveCard', version: '1.5', body: [] },
          },
        },
      },
    });

    expect(model?.blocks[0]).toMatchObject({ kind: 'adaptive-card' });
  });

  it('falls back to JSON for payloads that are neither cards nor recommendations', () => {
    const model = buildExtensionApiPreview({
      processResponse: { payload: { measurements: { lesionCount: 3 } } },
    });

    expect(model?.blocks[0]).toMatchObject({
      kind: 'json',
      title: 'Measurements',
      json: { lesionCount: 3 },
    });
    expect((model?.blocks[0] as { reason: string }).reason).toContain('formatted JSON');
  });

  it('surfaces a failed ProcessResponse as an error message', () => {
    const model = buildExtensionApiPreview({
      processResponse: { success: false, message: 'Report text was empty.', payload: {} },
    });

    expect(model?.blocks[0]).toEqual({
      kind: 'message',
      tone: 'error',
      text: 'Report text was empty.',
    });
  });

  it('falls back to the raw body when no envelope was returned', () => {
    const model = buildExtensionApiPreview({ rawBody: 'Internal Server Error' });

    expect(model?.blocks[0]).toMatchObject({ kind: 'json', json: 'Internal Server Error' });
  });
});

describe('result provider registry', () => {
  it('exposes the extension API source as available and the planned sources as not', () => {
    expect(getResultProvider('extension-api')?.available).toBe(true);
    expect(getResultProvider('pixel-ai')?.available).toBe(false);
    expect(getResultProvider('powerscribe')?.available).toBe(false);
    expect(listResultProviders().map((provider) => provider.source)).toEqual([
      'extension-api',
      'pixel-ai',
      'powerscribe',
    ]);
  });

  it('returns null for sources that are declared but not yet available', () => {
    expect(buildPreview('pixel-ai', recommendationResult)).toBeNull();
    expect(buildPreview('powerscribe', recommendationResult)).toBeNull();
  });

  it('lets a new source be plugged in without changing the caller', () => {
    const model: PreviewModel = {
      source: 'pixel-ai',
      sourceLabel: 'Pixel AI app',
      blocks: [{ kind: 'message', tone: 'success', text: 'Overlay ready' }],
    };
    const provider: ResultProvider = {
      source: 'pixel-ai',
      label: 'Pixel AI app',
      description: 'test double',
      available: true,
      buildPreview: () => model,
    };

    const original = getResultProvider('pixel-ai') as ResultProvider;
    registerResultProvider(provider);
    try {
      expect(buildPreview('pixel-ai', {})).toBe(model);
    } finally {
      registerResultProvider(original);
    }
  });
});
