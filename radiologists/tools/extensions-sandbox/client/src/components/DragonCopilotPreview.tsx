import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { buildPreview, listResultProviders } from '../preview';
import { JsonBlockView } from './JsonBlockView';
import type {
  PreviewBlock,
  PreviewRecommendation,
  RecommendationsBlock,
  ResultSource,
} from '../preview';

// Loaded on demand: the Adaptive Cards renderer is the single largest dependency
// in the bundle, and this tab renders nothing until a tool has been run.
const AdaptiveCardBlockView = lazy(() => import('./AdaptiveCardBlockView'));

export interface DragonCopilotPreviewProps {
  /**
   * The latest execution result, in the shape the active source's provider
   * expects. For `extension-api` this is the sandbox `ExecuteResult`.
   */
  result: unknown;
  /** Which result source to preview. Defaults to the extension API. */
  source?: ResultSource;
  /** Tool that produced the result, shown in the preview header. */
  toolName?: string;
}

function severityLabel(percent: number | undefined): string {
  if (percent === undefined) return 'Unspecified';
  if (percent >= 70) return 'High';
  if (percent >= 40) return 'Medium';
  if (percent > 0) return 'Low';
  return 'Informational';
}

function severityClass(percent: number | undefined): string {
  if (percent === undefined) return 'dc-severity-unspecified';
  if (percent >= 70) return 'dc-severity-high';
  if (percent >= 40) return 'dc-severity-medium';
  if (percent > 0) return 'dc-severity-low';
  return 'dc-severity-info';
}

function RecommendationView({ recommendation }: { recommendation: PreviewRecommendation }) {
  // Clamped once, then used for the chip, the bar and the ARIA values alike. The
  // schema caps severity at 0-100 but nothing enforces that on the wire, and an
  // out-of-range aria-valuenow is invalid against the min/max declared below. The
  // unclamped value stays visible in the Results tab.
  const raw = recommendation.severityScorePercent;
  const severity = raw === undefined ? undefined : Math.min(100, Math.max(0, raw));

  return (
    <li className="dc-recommendation">
      <div className="dc-recommendation-header">
        <span className={`dc-severity-chip ${severityClass(severity)}`}>
          {severityLabel(severity)}
          {severity !== undefined && <span className="dc-severity-score"> · {severity}%</span>}
        </span>
        {recommendation.qualityCheckType && (
          <span className="dc-recommendation-type">{recommendation.qualityCheckType}</span>
        )}
      </div>
      <p className="dc-recommendation-description">{recommendation.description}</p>
      {recommendation.reason && (
        <p className="dc-recommendation-reason">
          <span className="dc-recommendation-reason-label">Why: </span>
          {recommendation.reason}
        </p>
      )}
      {severity !== undefined && (
        <div
          className="dc-severity-bar"
          role="meter"
          aria-valuenow={severity}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Severity ${severity} percent`}
        >
          <div
            className={`dc-severity-bar-fill ${severityClass(severity)}`}
            style={{ width: `${severity}%` }}
          />
        </div>
      )}
      {recommendation.additionalInfo && (
        <dl className="dc-recommendation-info">
          {Object.entries(recommendation.additionalInfo).map(([key, value]) => (
            <div key={key} className="dc-recommendation-info-row">
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function RecommendationsBlockView({ block }: { block: RecommendationsBlock }) {
  return (
    <section className="dc-preview-block dc-preview-recommendations">
      {block.title && <h4 className="dc-preview-block-title">{block.title}</h4>}
      {block.recommendations.length === 0 ? (
        <p className="dc-preview-no-recommendations">
          No recommendations — the extension found nothing to flag for this report.
        </p>
      ) : (
        <ul className="dc-recommendation-list">
          {block.recommendations.map((recommendation, index) => (
            <RecommendationView
              key={`${index}-${recommendation.description}`}
              recommendation={recommendation}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PreviewBlockView({ block }: { block: PreviewBlock }) {
  switch (block.kind) {
    case 'adaptive-card':
      return (
        <Suspense fallback={<p className="dc-preview-card-loading">Loading card renderer…</p>}>
          <AdaptiveCardBlockView block={block} />
        </Suspense>
      );
    case 'recommendations':
      return <RecommendationsBlockView block={block} />;
    case 'json':
      return <JsonBlockView block={block} />;
    case 'message':
      return (
        <p className={`dc-preview-message dc-preview-message-${block.tone}`} role="status">
          {block.text}
        </p>
      );
  }
}

/**
 * Renders the latest execution result the way a clinician would see it inside
 * Dragon Copilot. Rendering goes through the result-source providers, so adding
 * pixel-based AI app or PowerScribe results is a provider change, not a UI change.
 */
export function DragonCopilotPreview({
  result,
  source = 'extension-api',
  toolName,
}: DragonCopilotPreviewProps) {
  const [activeSource, setActiveSource] = useState<ResultSource>(source);
  // Deliberately not memoized: the registry is mutable, so a memo keyed on `[]`
  // would pin whatever was registered at first render. The list is three entries.
  const providers = listResultProviders();
  // Declared-but-unimplemented sources stay out of the selector — a button that
  // can only ever reach an empty state is noise. They remain in the registry so
  // implementing one is still a provider change, not a UI change.
  const selectableProviders = providers.filter((provider) => provider.available);

  useEffect(() => {
    setActiveSource(source);
  }, [source]);

  // The result is passed through untouched. Merging `toolName` into it would
  // both overwrite a `toolName` the source did send and hand every future
  // provider a field that only means something to the extension API.
  const model = useMemo(
    () => buildPreview(activeSource, result, { toolName }),
    [activeSource, result, toolName],
  );

  const sourceSelector = selectableProviders.length > 1 && (
    <div className="dc-preview-sources" role="group" aria-label="Result source">
      {selectableProviders.map((provider) => (
        <button
          key={provider.source}
          type="button"
          className={`dc-preview-source-button${provider.source === activeSource ? ' active' : ''}`}
          aria-pressed={provider.source === activeSource}
          title={provider.description}
          onClick={() => setActiveSource(provider.source)}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );

  if (!model) {
    const activeProvider = providers.find((provider) => provider.source === activeSource);
    return (
      <div className="dc-preview">
        {sourceSelector}
        <div className="dc-preview-empty">
          <h3>No preview yet</h3>
          <p>
            {activeProvider && !activeProvider.available
              ? `${activeProvider.label} results are not available in the sandbox yet.`
              : 'Run a tool from the Setup tab to see how its result appears in Dragon Copilot.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dc-preview">
      {sourceSelector}
      <div className="dc-preview-frame">
        <div className="dc-preview-titlebar">
          <img src="/dragon-copilot-logo.png" alt="" className="dc-preview-logo" />
          <span className="dc-preview-product">Dragon Copilot</span>
          <span className="dc-preview-source-badge">{model.sourceLabel}</span>
          {model.producedBy && <span className="dc-preview-tool">{model.producedBy}</span>}
        </div>
        <div className="dc-preview-body">
          {model.blocks.map((block, index) => (
            <PreviewBlockView key={`${block.kind}-${index}`} block={block} />
          ))}
        </div>
      </div>
      <p className="dc-preview-footnote">
        Preview only — the live Dragon Copilot surface may apply additional styling.
      </p>
    </div>
  );
}
