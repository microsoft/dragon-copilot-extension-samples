import { useEffect, useRef, useState } from 'react';
import * as AdaptiveCardsLib from 'adaptivecards';
import { JsonBlockView } from './JsonBlockView';
import type { AdaptiveCardBlock } from '../preview';

/**
 * Host config that lines the Adaptive Cards renderer up with the Dragon Copilot
 * surface, so the preview is faithful rather than the renderer's default theme.
 */
const dragonCopilotHostConfig = {
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  spacing: { small: 4, default: 8, medium: 16, large: 20, extraLarge: 24, padding: 16 },
  separator: { lineThickness: 1, lineColor: '#e0e0e0' },
  containerStyles: {
    default: {
      backgroundColor: '#ffffff',
      foregroundColors: {
        default: { default: '#323130', subtle: '#605e5c' },
        accent: { default: '#0078d4', subtle: '#2b88d8' },
        good: { default: '#107c10', subtle: '#3a9b3a' },
        warning: { default: '#797673', subtle: '#a19f9d' },
        attention: { default: '#d13438', subtle: '#e05c5f' },
      },
    },
  },
  actions: {
    actionAlignment: 'left',
    actionsOrientation: 'horizontal',
    buttonSpacing: 8,
    spacing: 'default',
  },
};

// SECURITY: declining Markdown is what keeps partner text out of the HTML path.
// The renderer falls back to `innerText` when nothing processes the Markdown, so
// a payload cannot inject markup. Registering a Markdown engine here (as the
// Adaptive Cards docs suggest, to silence the per-card warning) would reopen
// that path — do not do so without routing the output through a sanitizer.
AdaptiveCardsLib.AdaptiveCard.onProcessMarkdown = (_text, result) => {
  result.didProcess = false;
};

export function AdaptiveCardBlockView({ block }: { block: AdaptiveCardBlock }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Keyed by the card that failed: the fallback unmounts the host element, so a
  // plain error flag could never be cleared and every later card would be stuck
  // in the JSON fallback.
  const [failure, setFailure] = useState<{ card: unknown; message: string } | null>(null);
  const renderError = failure && failure.card === block.card ? failure.message : null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    try {
      const card = new AdaptiveCardsLib.AdaptiveCard();
      card.hostConfig = new AdaptiveCardsLib.HostConfig(dragonCopilotHostConfig);
      // The preview is read-only: card actions must not navigate or submit.
      card.onExecuteAction = () => undefined;
      card.parse(block.card);

      const rendered = card.render();
      if (!rendered) {
        throw new Error('The Adaptive Cards renderer produced no output.');
      }

      host.replaceChildren(rendered);
      setFailure(null);
    } catch (error) {
      host.replaceChildren();
      setFailure({
        card: block.card,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [block.card]);

  if (renderError) {
    return (
      <JsonBlockView
        block={{
          kind: 'json',
          title: block.title,
          reason: `This Adaptive Card could not be rendered (${renderError}), so it is shown as formatted JSON.`,
          json: block.card,
        }}
      />
    );
  }

  return (
    <section className="dc-preview-block dc-preview-card">
      {block.title && <h4 className="dc-preview-block-title">{block.title}</h4>}
      <div className="dc-adaptive-card-host" ref={hostRef} data-testid="adaptive-card-host" />
    </section>
  );
}

// Default export so the pane can pull this in with `React.lazy`, which keeps the
// Adaptive Cards renderer out of the initial bundle.
export default AdaptiveCardBlockView;
