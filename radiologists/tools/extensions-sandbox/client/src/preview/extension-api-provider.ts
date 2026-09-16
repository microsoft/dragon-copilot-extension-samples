import type {
  PreviewBlock,
  PreviewModel,
  PreviewRecommendation,
  ResultProvider,
} from './types';

/**
 * The execution result the sandbox already holds for a tool run, narrowed to the
 * fields the preview needs. Mirrors `ExecuteResult` in `TestingPanel`.
 */
export interface ExtensionApiResult {
  toolName?: string;
  /** HTTP status the extension responded with, as proxied by the sandbox. */
  status?: number;
  statusText?: string;
  processResponse?: {
    success?: boolean;
    message?: string;
    payload?: Record<string, unknown>;
  } | null;
  rawBody?: unknown;
}

const RECORD_TYPE = '[object Object]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === RECORD_TYPE;
}

/**
 * Turns a payload key into a heading: `quality-result` and `qualityCheckResult`
 * both become readable titles without the partner having to supply one.
 */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Adaptive Cards are identified structurally rather than by content-type: the
 * radiologists Extensibility API does not declare a card content-type today, and
 * a card is unambiguous on its own (`type: "AdaptiveCard"`).
 */
export function isAdaptiveCard(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === 'AdaptiveCard';
}

/** Unwraps `{ contentType: 'application/vnd.microsoft.card.adaptive', content }` envelopes. */
function unwrapCard(value: unknown): Record<string, unknown> | null {
  if (isAdaptiveCard(value)) return value;
  if (isRecord(value) && isAdaptiveCard(value.content)) {
    return value.content as Record<string, unknown>;
  }
  return null;
}

function toRecommendation(value: unknown): PreviewRecommendation | null {
  if (!isRecord(value)) return null;
  if (typeof value.description !== 'string') return null;

  const recommendation: PreviewRecommendation = { description: value.description };
  if (typeof value.qualityCheckType === 'string') {
    recommendation.qualityCheckType = value.qualityCheckType;
  }
  if (typeof value.reason === 'string') {
    recommendation.reason = value.reason;
  }
  if (typeof value.severityScorePercent === 'number' && Number.isFinite(value.severityScorePercent)) {
    recommendation.severityScorePercent = value.severityScorePercent;
  }
  if (isRecord(value.additionalInfo)) {
    const info: Record<string, string> = {};
    for (const [key, item] of Object.entries(value.additionalInfo)) {
      if (typeof item === 'string') info[key] = item;
    }
    if (Object.keys(info).length > 0) recommendation.additionalInfo = info;
  }
  return recommendation;
}

/**
 * Fields only a quality check carries. `description` on its own is too common to
 * infer intent from — attachments, findings and links all have one.
 */
function isQualityCheckShaped(recommendation: PreviewRecommendation): boolean {
  return (
    recommendation.qualityCheckType !== undefined ||
    recommendation.reason !== undefined ||
    recommendation.severityScorePercent !== undefined
  );
}

/**
 * Recognizes recommendation output either as `{ recommendations: [...] }` or as a
 * bare array of recommendations. Returns `null` when the shape does not match, so
 * the caller can fall back to JSON.
 *
 * A bare array has to prove itself, because the recommendations view makes
 * clinical claims about what it is given: every item must look like a quality
 * check, and an empty bare array is rejected outright. Otherwise `{"attachments":
 * [{"description": "chest x-ray"}]}` would be given severity chips, and
 * `{"measurements": []}` would tell the clinician there was "nothing to flag" for
 * a payload that was never a recommendation list. Only the explicit
 * `{ recommendations: [] }` wrapper states that intent, so only it may be empty.
 */
export function toRecommendations(value: unknown): PreviewRecommendation[] | null {
  let items: unknown[] | null = null;
  let declared = false;

  if (isRecord(value) && Array.isArray(value.recommendations)) {
    items = value.recommendations;
    declared = true;
  } else if (Array.isArray(value)) {
    items = value;
  }

  if (!items) return null;
  if (items.length === 0) return declared ? [] : null;

  const mapped = items.map(toRecommendation);
  if (mapped.some((item) => item === null)) return null;

  const recommendations = mapped as PreviewRecommendation[];
  if (!declared && !recommendations.every(isQualityCheckShaped)) return null;
  return recommendations;
}

function blockForPayloadEntry(key: string, value: unknown): PreviewBlock {
  const title = humanizeKey(key);

  const card = unwrapCard(value);
  if (card) {
    return { kind: 'adaptive-card', title, card };
  }

  const recommendations = toRecommendations(value);
  if (recommendations) {
    return { kind: 'recommendations', title, recommendations };
  }

  return {
    kind: 'json',
    title,
    reason: 'This output is not an Adaptive Card or a recognized recommendation list, so it is shown as formatted JSON.',
    json: value,
  };
}

function isExtensionApiResult(input: unknown): input is ExtensionApiResult {
  return isRecord(input);
}

/**
 * Builds the preview for a result returned by a partner extension over the
 * Extensibility API — the only source wired up today.
 */
export function buildExtensionApiPreview(input: unknown): PreviewModel | null {
  if (!isExtensionApiResult(input)) return null;

  const { processResponse, rawBody, toolName, status, statusText } = input;
  const blocks: PreviewBlock[] = [];

  // A failed call is a result too. Without this the preview blames the schema for
  // what was really a transport failure, and an error with an empty body falls
  // through to the "run a tool" empty state for a tool that *was* run.
  const failed = typeof status === 'number' && status >= 400;
  if (failed) {
    blocks.push({
      kind: 'message',
      tone: 'error',
      text: `The extension returned HTTP ${status}${statusText ? ` ${statusText}` : ''}. Dragon Copilot would show nothing to the clinician for this result.`,
    });
  }

  if (processResponse) {
    if (processResponse.success === false) {
      blocks.push({
        kind: 'message',
        tone: 'error',
        text: processResponse.message || 'The extension reported that processing did not succeed.',
      });
    } else if (processResponse.message) {
      blocks.push({ kind: 'message', tone: 'success', text: processResponse.message });
    }

    const payload = processResponse.payload;
    const entries = isRecord(payload) ? Object.entries(payload) : [];

    for (const [key, value] of entries) {
      blocks.push(blockForPayloadEntry(key, value));
    }

    if (entries.length === 0) {
      blocks.push({
        kind: 'json',
        title: 'Response',
        reason: 'The response carried no payload to preview, so the raw response is shown instead.',
        json: processResponse,
      });
    }
  } else if (rawBody !== undefined && rawBody !== null && rawBody !== '') {
    blocks.push({
      kind: 'json',
      title: 'Response',
      reason: failed
        ? 'The error response body is shown as formatted JSON.'
        : 'The extension did not return a ProcessResponse envelope, so the raw response body is shown instead.',
      json: rawBody,
    });
  }

  if (blocks.length === 0) return null;

  return {
    source: 'extension-api',
    sourceLabel: 'Extension API',
    producedBy: toolName,
    blocks,
  };
}

export const extensionApiProvider: ResultProvider = {
  source: 'extension-api',
  label: 'Extension API',
  description: 'Results returned by a partner extension over the Extensibility API.',
  available: true,
  buildPreview: buildExtensionApiPreview,
};
