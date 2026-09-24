import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDownRegular,
  ChevronUpRegular,
  DocumentSparkleRegular,
  ShieldFilled,
} from '@fluentui/react-icons';
import { buildPreview, listResultProviders } from '../preview';
import { JsonBlockView } from './JsonBlockView';
import type {
  MessageBlock,
  PreviewBlock,
  PreviewRecommendation,
  RecommendationsBlock,
  ResultSource,
} from '../preview';

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
  /** Manifest `name` of the extension, credited after each recommendation. */
  extensionName?: string;
}

type ContentBlock = Exclude<PreviewBlock, MessageBlock>;

interface RecommendationGroup {
  category?: string;
  recommendations: PreviewRecommendation[];
}

/** Groups recommendations under their quality check type, in order of first appearance. */
function groupByCategory(recommendations: PreviewRecommendation[]): RecommendationGroup[] {
  const groups = new Map<string | undefined, RecommendationGroup>();
  for (const recommendation of recommendations) {
    const category = recommendation.qualityCheckType;
    let group = groups.get(category);
    if (!group) {
      group = { category, recommendations: [] };
      groups.set(category, group);
    }
    group.recommendations.push(recommendation);
  }
  return [...groups.values()];
}

/** The Report optimization card shell. DCR opens it by default and lets the user collapse it. */
function ReportOptimizationCard({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const bodyId = useId();
  const Chevron = expanded ? ChevronUpRegular : ChevronDownRegular;

  return (
    <section className="dc-preview-block dc-report-optimization">
      <h4 className="dc-report-optimization-title">
        <button
          type="button"
          className="dc-report-optimization-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span>{title}</span>
          <Chevron className="dc-report-optimization-chevron" aria-hidden />
        </button>
      </h4>
      <div id={bodyId} className="dc-report-optimization-body" hidden={!expanded}>
        {children}
      </div>
    </section>
  );
}

/**
 * Mirrors the populated Report optimization card in the DCR design: a counted
 * title, recommendations grouped under a category heading, each bullet reading
 * as one paragraph that ends with the partner's name, and the AI / third-party
 * disclaimers underneath.
 */
function RecommendationsBlockView({
  block,
  attribution,
}: {
  block: RecommendationsBlock;
  attribution?: string;
}) {
  const count = block.recommendations.length;

  return (
    <ReportOptimizationCard title={`Report optimization (${count})`}>
      {count === 0 ? (
        <p className="dc-report-optimization-message">
          No recommendations — the extension found nothing to flag for this report.
        </p>
      ) : (
        <>
          {groupByCategory(block.recommendations).map((group, groupIndex) => (
            <div key={`${groupIndex}-${group.category ?? ''}`} className="dc-recommendation-group">
              {group.category && (
                <div className="dc-recommendation-category">
                  <DocumentSparkleRegular className="dc-recommendation-category-icon" aria-hidden />
                  <span>{group.category}</span>
                </div>
              )}
              <ul className="dc-recommendation-list">
                {group.recommendations.map((recommendation, index) => (
                  <li key={`${index}-${recommendation.description}`} className="dc-recommendation">
                    <p className="dc-recommendation-text">
                      <span className="dc-recommendation-description">{recommendation.description}</span>
                      {recommendation.reason && (
                        <span className="dc-recommendation-reason"> {recommendation.reason}</span>
                      )}
                      {attribution && (
                        <span className="dc-recommendation-attribution"> ({attribution})</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="dc-disclaimers">
            <span className="dc-disclaimer">
              <ShieldFilled className="dc-disclaimer-icon dc-disclaimer-icon-ai" aria-hidden />
              <span>AI-generated content may be incorrect</span>
            </span>
            <span className="dc-disclaimer">
              <ShieldFilled className="dc-disclaimer-icon dc-disclaimer-icon-third-party" aria-hidden />
              <span>Third-party generated content</span>
            </span>
          </div>
        </>
      )}
    </ReportOptimizationCard>
  );
}

/** The Dragon Copilot window chrome around what the clinician would see. */
function DragonCopilotFrame({
  sourceLabel,
  producedBy,
  children,
}: {
  sourceLabel: string;
  producedBy?: string;
  children: ReactNode;
}) {
  return (
    <div className="dc-preview-frame">
      <div className="dc-preview-titlebar">
        <img src="/dragon-copilot-logo.png" alt="" className="dc-preview-logo" />
        <span className="dc-preview-product">Dragon Copilot</span>
        <span className="dc-preview-source-badge">{sourceLabel}</span>
        {producedBy && <span className="dc-preview-tool">{producedBy}</span>}
      </div>
      <div className="dc-preview-body">{children}</div>
    </div>
  );
}

function ContentBlockView({ block, attribution }: { block: ContentBlock; attribution?: string }) {
  switch (block.kind) {
    case 'recommendations':
      return <RecommendationsBlockView block={block} attribution={attribution} />;
    case 'json':
      return <JsonBlockView block={block} />;
  }
}

function isMessage(block: PreviewBlock): block is MessageBlock {
  return block.kind === 'message';
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
  extensionName,
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

  // The result is passed through untouched. Merging run context into it would
  // both overwrite same-named fields the source did send and hand every future
  // provider fields that only mean something to the extension API.
  const model = useMemo(
    () => buildPreview(activeSource, result, { toolName, extensionName }),
    [activeSource, result, toolName, extensionName],
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

  const footnote = 'Preview only — the live Dragon Copilot surface may apply additional styling.';

  if (!model) {
    const activeProvider = providers.find((provider) => provider.source === activeSource);
    if (!activeProvider?.available) {
      return (
        <div className="dc-preview">
          {sourceSelector}
          <div className="dc-preview-empty">
            <h3>No preview yet</h3>
            <p>{`${activeProvider?.label ?? 'These'} results are not available in the sandbox yet.`}</p>
          </div>
        </div>
      );
    }

    // Before a run, DCR still shows the card, telling the radiologist how to
    // trigger it. The sandbox equivalent of Smart Impression is running a tool.
    return (
      <div className="dc-preview">
        {sourceSelector}
        <div className="dc-preview-run-status">
          <p className="dc-preview-message dc-preview-message-info">
            No tool has run yet. In Dragon Copilot, Smart Impression triggers the extension; here,
            run a tool from the Setup tab.
          </p>
        </div>
        <DragonCopilotFrame sourceLabel={activeProvider.label} producedBy={toolName}>
          <ReportOptimizationCard title="Report optimization">
            <p className="dc-report-optimization-message">Run smart impression to view suggestions.</p>
          </ReportOptimizationCard>
        </DragonCopilotFrame>
        <p className="dc-preview-footnote">{footnote}</p>
      </div>
    );
  }

  // Status lines describe the run for the partner; the frame holds only what the
  // clinician would see. A run with nothing to show (e.g. an HTTP error with an
  // empty body) therefore gets no frame at all.
  const messages = model.blocks.filter(isMessage);
  const content = model.blocks.filter((block): block is ContentBlock => !isMessage(block));
  const showsRecommendations = content.some((block) => block.kind === 'recommendations');

  return (
    <div className="dc-preview">
      {sourceSelector}
      {messages.length > 0 && (
        <div className="dc-preview-run-status">
          {messages.map((message, index) => (
            <p
              key={`${message.tone}-${index}`}
              className={`dc-preview-message dc-preview-message-${message.tone}`}
              role="status"
            >
              {message.text}
            </p>
          ))}
        </div>
      )}
      {content.length > 0 && (
        <DragonCopilotFrame sourceLabel={model.sourceLabel} producedBy={model.producedBy}>
          {content.map((block, index) => (
            <ContentBlockView
              key={`${block.kind}-${index}`}
              block={block}
              attribution={model.attribution}
            />
          ))}
        </DragonCopilotFrame>
      )}
      <p className="dc-preview-footnote">
        {footnote}
        {showsRecommendations &&
          ' The Report optimization card does not show severityScorePercent or additionalInfo, so they are omitted here; the full response is in the Outputs tab.'}
      </p>
    </div>
  );
}
