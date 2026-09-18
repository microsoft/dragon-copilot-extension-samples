import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Forces the renderer to fail so the pane's card fallback path can be exercised;
// a malformed card payload is not enough, because the renderer tolerates most of
// them and simply draws nothing.
const shouldFail = { value: true };

vi.mock('adaptivecards', () => {
  class AdaptiveCard {
    static onProcessMarkdown: unknown;
    hostConfig: unknown;
    onExecuteAction: (() => void) | undefined;
    parse() {}
    render(): HTMLElement {
      if (shouldFail.value) {
        throw new Error('renderer unavailable');
      }
      const element = document.createElement('div');
      element.textContent = 'rendered card';
      return element;
    }
  }
  class HostConfig {
    constructor(public config: unknown) {}
  }
  return { AdaptiveCard, HostConfig };
});

const { DragonCopilotPreview } = await import('../DragonCopilotPreview');

function cardResult(text: string) {
  return {
    processResponse: {
      payload: {
        summaryCard: { type: 'AdaptiveCard', version: '1.5', body: [{ type: 'TextBlock', text }] },
      },
    },
  };
}

describe('DragonCopilotPreview card fallback', () => {
  it('falls back to formatted JSON when a card cannot be rendered', async () => {
    shouldFail.value = true;
    render(<DragonCopilotPreview result={cardResult('first')} />);

    // Awaited first: the card view is loaded lazily, and a `queryBy` assertion
    // would pass trivially against the Suspense fallback before it resolves.
    expect(
      await screen.findByText(/could not be rendered \(renderer unavailable\)/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('adaptive-card-host')).toBeNull();
    const fallback = document.querySelector('.dc-preview-json');
    expect(fallback).not.toBeNull();
    expect(fallback?.querySelector('pre')?.textContent).toContain('"AdaptiveCard"');
  });

  it('recovers for the next result instead of staying in the fallback', async () => {
    shouldFail.value = true;
    const { rerender } = render(<DragonCopilotPreview result={cardResult('first')} />);
    await screen.findByText(/could not be rendered \(renderer unavailable\)/);
    expect(screen.queryByTestId('adaptive-card-host')).toBeNull();

    shouldFail.value = false;
    rerender(<DragonCopilotPreview result={cardResult('second')} />);

    expect(await screen.findByTestId('adaptive-card-host')).toHaveTextContent('rendered card');
    expect(document.querySelector('.dc-preview-json')).toBeNull();
  });
});
