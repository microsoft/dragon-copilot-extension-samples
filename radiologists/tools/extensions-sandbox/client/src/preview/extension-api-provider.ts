import type {
  PreviewBlock,
  PreviewContext,
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
    // Acronym runs first: `HTTPStatus` splits after the run, not inside it, so
    // the rule below cannot turn it into "H T T P Status".
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
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

/** A bare card, or one inside a `{ contentType: 'application/vnd.microsoft.card.adaptive', content }` envelope. */
function carriesAdaptiveCard(value: unknown): boolean {
  return isAdaptiveCard(value) || (isRecord(value) && isAdaptiveCard(value.content));
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
  return recommendation;
}

/**
 * Fields only a quality check carries. `description` on its own is too common to
 * infer intent from — attachments, findings and links all have one. Checked on
 * the raw item because severity is not carried into the preview model.
 */
function isQualityCheckShaped(value: Record<string, unknown>): boolean {
  return (
    typeof value.qualityCheckType === 'string' ||
    typeof value.reason === 'string' ||
    (typeof value.severityScorePercent === 'number' && Number.isFinite(value.severityScorePercent))
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
 * [{"description": "chest x-ray"}]}` would be listed as a Report optimization
 * recommendation, and `{"measurements": []}` would tell the clinician there was
 * "nothing to flag" for a payload that was never a recommendation list. Only the
 * explicit `{ recommendations: [] }` wrapper states that intent, so only it may be
 * empty.
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
  if (!declared && !items.every((item) => isRecord(item) && isQualityCheckShaped(item))) return null;
  return mapped as PreviewRecommendation[];
}

function blockForPayloadEntry(key: string, value: unknown): PreviewBlock {
  const title = humanizeKey(key);

  // Dragon Copilot for radiologists does not render Adaptive Cards (see the DCR
  // extensions manifest spec), so a card is flagged rather than previewed.
  if (carriesAdaptiveCard(value)) {
    return {
      kind: 'json',
      title,
      reason: 'This output is an Adaptive Card. Dragon Copilot for radiologists does not support Adaptive Cards, so the clinician would not see it. It is shown here as formatted JSON.',
      reasonTone: 'warning',
      json: value,
    };
  }

  const recommendations = toRecommendations(value);
  if (recommendations) {
    return { kind: 'recommendations', recommendations };
  }

  return {
    kind: 'json',
    title,
    reason: 'This output is not a recognized recommendation list, so it is shown as formatted JSON.',
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
export function buildExtensionApiPreview(
  input: unknown,
  context: PreviewContext = {},
): PreviewModel | null {
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
    // The transport status is the last word on whether the clinician sees
    // anything, so a body message on a failed call is detail about that failure
    // and must never carry the success tone. When both the status and the body
    // report failure, the HTTP block above has already said so — only a specific
    // message adds anything, and the generic fallback would just repeat it.
    if (processResponse.success === false) {
      if (!failed) {
        blocks.push({
          kind: 'message',
          tone: 'error',
          text: processResponse.message || 'The extension reported that processing did not succeed.',
        });
      } else if (processResponse.message) {
        blocks.push({ kind: 'message', tone: 'error', text: processResponse.message });
      }
    } else if (processResponse.message) {
      blocks.push({
        kind: 'message',
        tone: failed ? 'error' : 'success',
        text: processResponse.message,
      });
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
    // The pane knows which tool it ran; the payload only sometimes says. Prefer
    // the caller's answer, but never discard the payload's when there is none.
    producedBy: context.toolName ?? toolName,
    // The manifest has no publisher display name, so its `name` is made readable
    // to stand in for the partner name Dragon Copilot shows.
    attribution: context.extensionName ? humanizeKey(context.extensionName) : undefined,
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
