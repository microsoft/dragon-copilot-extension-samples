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

/** A single quality-check style recommendation, normalized for display. */
export interface PreviewRecommendation {
  qualityCheckType?: string;
  description: string;
  reason?: string;
  severityScorePercent?: number;
  additionalInfo?: Record<string, string>;
}

/** An Adaptive Card payload rendered with the Adaptive Cards renderer. */
export interface AdaptiveCardBlock {
  kind: 'adaptive-card';
  /** Payload key or output name this block was built from. */
  title?: string;
  card: Record<string, unknown>;
}

/** A clinician-friendly summary of structured recommendation output. */
export interface RecommendationsBlock {
  kind: 'recommendations';
  title?: string;
  recommendations: PreviewRecommendation[];
}

/** A short status line shown above the result body. */
export interface MessageBlock {
  kind: 'message';
  text: string;
  tone: 'success' | 'error';
}

/** Fallback for anything that cannot be rendered as a card or a summary. */
export interface JsonBlock {
  kind: 'json';
  title?: string;
  /** Why the richer renderers were not used — surfaced to the partner. */
  reason?: string;
  json: unknown;
}

export type PreviewBlock =
  | AdaptiveCardBlock
  | RecommendationsBlock
  | MessageBlock
  | JsonBlock;

/** Renderer-neutral description of one previewed result. */
export interface PreviewModel {
  source: ResultSource;
  sourceLabel: string;
  /** Tool (or app) that produced the result, when known. */
  producedBy?: string;
  blocks: PreviewBlock[];
}

/**
 * Translates a source-specific result into a `PreviewModel`.
 *
 * `buildPreview` takes `unknown` so the registry can hold providers for sources
 * whose payload shapes are unrelated; each provider narrows its own input and
 * returns `null` when it has nothing to show (which the pane renders as the
 * empty state).
 */
export interface ResultProvider {
  source: ResultSource;
  label: string;
  description: string;
  /** False for sources that are declared but not yet wired up. */
  available: boolean;
  buildPreview(input: unknown): PreviewModel | null;
}
