import { randomUUID } from 'node:crypto';
import type { ManifestTool } from '../schemas/manifest.schema.js';
import { parseAndGroupInputs } from 'extensions-sandbox-shared';
import { createLogger } from '../utils/logger.js';

const log = createLogger('extension-call');

/**
 * Session context for request correlation and tracking.
 * Corresponds to the SessionData schema in radiologists-extensibility-api.yaml.
 * Property names are snake_case by design, inherited from the upstream Dragon
 * SessionData contract.
 */
export interface SessionData {
  correlation_id: string;
  session_start?: string;
  environment_id?: string;
}

/**
 * Request envelope sent to the extension's `v1/process` endpoint.
 * Corresponds to the ProcessRequest schema in radiologists-extensibility-api.yaml:
 * a required `sessionData`, an optional `extensibilityApiVersion`, and the tool's
 * named inputs (e.g. `report`, `patientInformation`) spread as top-level
 * properties (the schema allows `additionalProperties: true`).
 */
export interface ProcessRequest {
  extensibilityApiVersion?: string;
  sessionData: SessionData;
  [inputName: string]: unknown;
}

/**
 * Response envelope returned by the extension's `v1/process` endpoint.
 * Corresponds to the ProcessResponse schema in radiologists-extensibility-api.yaml.
 * `payload` is a map of named outputs (keyed by the output name from the manifest,
 * e.g. `qualityCheckResult`), each value being a tool-specific result object.
 */
export interface ProcessResponse {
  success?: boolean;
  message?: string;
  payload?: Record<string, unknown>;
}

/**
 * Options for executing a tool call against a partner extension endpoint.
 */
export interface ExecuteToolOptions {
  tool: ManifestTool;
  inputs: Record<string, string>;
  customerTenantId: string;
  /** Extensibility API version from the manifest, echoed into the ProcessRequest. */
  extensibilityApiVersion?: string;
  bearerToken?: string;
  timeoutMs?: number;
}

/**
 * Result of an extension tool execution.
 */
export interface ExecuteToolResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  /** The parsed ProcessResponse if the response matched the expected envelope. */
  processResponse?: ProcessResponse;
  /** Raw response body (used when the response doesn't match the expected envelope). */
  rawBody?: unknown;
  /** The ProcessRequest that was sent (for debugging/inspection). */
  sentRequest: ProcessRequest;
}

/**
 * Builds a ProcessRequest envelope for the extension's `v1/process` endpoint,
 * matching the contract in radiologists-extensibility-api.yaml.
 *
 * The envelope carries:
 * - `sessionData` with a freshly generated `correlation_id` (required by the schema),
 *   and `environment_id` set from the caller's tenant when available.
 * - `extensibilityApiVersion` echoed from the manifest, when provided.
 * - The tool's named inputs (e.g. `report`, `patientInformation`) spread as
 *   top-level properties. Input names come straight from the manifest, so they
 *   map onto the schema's `report` / `patientInformation` fields (and any extra
 *   inputs land in the schema's `additionalProperties`).
 */
export function buildProcessRequest(
  _tool: ManifestTool,
  inputs: Record<string, unknown>,
  options: { customerTenantId?: string; extensibilityApiVersion?: string } = {},
): ProcessRequest {
  const { customerTenantId, extensibilityApiVersion } = options;

  const sessionData: SessionData = { correlation_id: randomUUID() };
  if (customerTenantId) {
    sessionData.environment_id = customerTenantId;
  }

  const request: ProcessRequest = { sessionData };
  if (extensibilityApiVersion) {
    request.extensibilityApiVersion = extensibilityApiVersion;
  }

  for (const [name, value] of Object.entries(inputs)) {
    request[name] = value;
  }

  return request;
}

/**
 * Calls an extension's `v1/process` endpoint using the Dragon Copilot
 * (radiologists) Extensibility API contract:
 *
 * 1. Builds a ProcessRequest envelope (sessionData + named inputs)
 * 2. Sets Accept: application/json header
 * 3. Optionally attaches Bearer token (in the real service this comes from
 *    EntraAuth client-credentials flow)
 * 4. POSTs JSON to tool.endpoint
 * 5. Expects a ProcessResponse envelope back
 */
export async function callExtensionAsync(
  options: ExecuteToolOptions,
): Promise<ExecuteToolResult> {
  const { tool, inputs, customerTenantId, extensibilityApiVersion, bearerToken, timeoutMs = 30000 } = options;

  if (!tool.endpoint) {
    throw new Error('Tool endpoint is not configured.');
  }

  // Parse input values from strings to objects and group dot-delimited field
  // paths (e.g. "report.reportText") into nested objects keyed by input name,
  // so they map onto the ProcessRequest's named-input properties.
  const parsedInputs = parseAndGroupInputs(inputs);

  const processRequest = buildProcessRequest(tool, parsedInputs, {
    customerTenantId,
    extensibilityApiVersion,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // In the real service, ConfigureAuthentication attaches a Bearer token
  // acquired via EntraAuth client-credentials flow. Here we forward
  // a user-provided token if available.
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  const requestBody = JSON.stringify(processRequest);
  log.info(`POST ${tool.endpoint} (timeout ${timeoutMs}ms)`);
  log.info(`Request headers: ${JSON.stringify(redactHeaders(headers))}`);
  log.info(
    `Request envelope: correlationId=${processRequest.sessionData.correlation_id}, ` +
    `tool='${tool.name}', inputs=[${Object.keys(parsedInputs).join(', ') || 'none'}], ` +
    `bodySize=${requestBody.length} bytes`,
  );
  // The raw request body and reproducible curl command can contain
  // clinical/PHI-shaped input values, so they are only emitted at debug level
  // (set LOG_LEVEL=debug). They are never logged during normal runs.
  log.debug(`Request body: ${requestBody}`);
  log.debug(`Reproduce with curl:\n${buildCurlCommand(tool.endpoint, headers, requestBody)}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = Date.now();
  try {
    const response = await fetch(tool.endpoint, {
      method: 'POST',
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const contentType = response.headers.get('content-type') || '';
    const durationMs = Date.now() - startedAt;

    log.info(
      `Response ${response.status} ${response.statusText} in ${durationMs}ms ` +
      `(content-type: ${contentType || 'unknown'})`,
    );
    log.info(`Response headers: ${JSON.stringify(redactHeaders(responseHeaders))}`);

    let rawBody: unknown;
    if (contentType.includes('application/json')) {
      rawBody = await response.json();
    } else {
      rawBody = await response.text();
    }

    // Attempt to interpret as a ProcessResponse envelope
    let processResponse: ProcessResponse | undefined;
    if (isProcessResponse(rawBody)) {
      processResponse = rawBody;
      const outputCount = processResponse.payload ? Object.keys(processResponse.payload).length : 0;
      log.info(
        `Response matched ProcessResponse envelope: success=${processResponse.success ?? 'n/a'}, ${outputCount} output(s).`,
      );
    } else {
      log.warn('Response did not match the expected ProcessResponse envelope; returning raw body.');
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      processResponse,
      rawBody: processResponse ? undefined : rawBody,
      sentRequest: processRequest,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error(`Request to ${tool.endpoint} failed after ${durationMs}ms: ${message}`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Header names whose values must never be written to the console, matched
 * case-insensitively. Covers request auth as well as sensitive headers that
 * may appear on extension responses (e.g. Set-Cookie).
 */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
]);

/**
 * Returns a shallow copy of headers with any sensitive values redacted,
 * so bearer tokens, cookies, and similar secrets are never written to the
 * console. Matching is case-insensitive and applies to both request and
 * response headers.
 */
function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? '***redacted***' : value;
  }
  return redacted;
}

/**
 * Builds a copy-pasteable `curl` command that reproduces the extension call.
 *
 * The Authorization header is redacted so bearer tokens are never logged.
 * Single quotes inside values are escaped so the command is safe to paste
 * into a POSIX shell. The body is passed via --data so it round-trips exactly.
 */
function buildCurlCommand(
  endpoint: string,
  headers: Record<string, string>,
  body: string,
): string {
  const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

  const parts = [`curl -X POST ${shellQuote(endpoint)}`];
  for (const [name, value] of Object.entries(redactHeaders(headers))) {
    parts.push(`  -H ${shellQuote(`${name}: ${value}`)}`);
  }
  parts.push(`  --data ${shellQuote(body)}`);
  return parts.join(' \\\n');
}

/**
 * Type guard to check if a response body matches the ProcessResponse envelope.
 *
 * A ProcessResponse carries its named tool outputs under `payload` (a map keyed
 * by output name). We require a non-null `payload` object so the caller can
 * reliably extract the tool output for schema validation; error envelopes
 * (e.g. `{ "error": ... }` or RFC 9110 problem details) are excluded.
 */
function isProcessResponse(body: unknown): body is ProcessResponse {
  if (body === null || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  return (
    obj.payload !== null &&
    typeof obj.payload === 'object' &&
    !Array.isArray(obj.payload)
  );
}

