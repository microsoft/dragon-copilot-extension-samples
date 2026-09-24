/**
 * Types for the Dragon Copilot preview pane.
 *
 * The preview renders a *result* — what a clinician would be shown in Dragon
 * Copilot — rather than the raw transport payload. Results can come from more than
 * one place, so providers translate a source-specific payload into the neutral
 * `PreviewModel` the UI knows how to render. Adding a new source therefore means
 * adding a provider, not reworking the pane.
 */

/** Where a previewed result came from. */
export type ResultSource = 'extension-api' | 'pixel-ai' | 'powerscribe';

/**
 * A single quality-check recommendation, narrowed to the fields the Dragon Copilot
 * Report optimization card shows. `severityScorePercent`, `additionalInfo`,
 * `provenance` and `referenceResources` are deliberately absent: the card does not
 * display them, so previewing them would misrepresent what the clinician sees.
 */
export interface PreviewRecommendation {
  qualityCheckType?: string;
  description: string;
  reason?: string;
}

/** Structured recommendation output, rendered as the Report optimization card. */
export interface RecommendationsBlock {
  kind: 'recommendations';
  recommendations: PreviewRecommendation[];
}

/**
 * A status line about the run, shown above the Dragon Copilot frame. It is never
 * part of what the clinician sees.
 */
export interface MessageBlock {
  kind: 'message';
  text: string;
  tone: 'success' | 'error';
}

/** Fallback for anything that cannot be rendered as the Report optimization card. */
export interface JsonBlock {
  kind: 'json';
  title?: string;
  /** Why the richer renderer was not used — surfaced to the partner. */
  reason?: string;
  /** `warning` when the clinician would not see this output at all. */
  reasonTone?: 'note' | 'warning';
  json: unknown;
}

export type PreviewBlock =
  | RecommendationsBlock
  | MessageBlock
  | JsonBlock;

/** Renderer-neutral description of one previewed result. */
export interface PreviewModel {
  source: ResultSource;
  sourceLabel: string;
  /** Tool (or app) that produced the result, when known. */
  producedBy?: string;
  /**
   * Name credited after each recommendation, where Dragon Copilot credits the
   * partner, e.g. "(Zotec Partners)".
   */
  attribution?: string;
  blocks: PreviewBlock[];
}

/**
 * What the pane knows about a run that the payload itself does not carry.
 *
 * Passed alongside the result rather than merged into it: splicing fields into an
 * opaque payload would both destroy same-named fields the source did send and
 * push one source's vocabulary onto every other provider.
 */
export interface PreviewContext {
  /** Tool the sandbox ran to produce this result, when known. */
  toolName?: string;
  /** Manifest `name` of the extension that owns the tool, when known. */
  extensionName?: string;
}

/**
 * Translates a source-specific result into a `PreviewModel`.
 *
 * `buildPreview` takes `unknown` so the registry can hold providers for sources
 * whose payload shapes are unrelated; each provider narrows its own input and
 * returns `null` when it has nothing to show (which the pane renders as the
 * empty state). `context` carries run metadata the payload does not include.
 */
export interface ResultProvider {
  source: ResultSource;
  label: string;
  description: string;
  /** False for sources that are declared but not yet wired up. */
  available: boolean;
  buildPreview(input: unknown, context: PreviewContext): PreviewModel | null;
}
