import { randomUUID } from 'node:crypto';
import type { ManifestTool } from '../schemas/manifest.schema.js';
import { parseInputValues } from 'extensions-sandbox-shared';
import { createLogger } from '../utils/logger.js';

const log = createLogger('extension-call');

/**
 * Request envelope sent to extension endpoints.
 * Mirrors the ExtensionRequest format used by
 * diag-radex-extension-service's ExtensionClient.
 */
export interface ExtensionRequest {
  requestId: string;
  customerTenantId: string;
  tools: ToolRequest[];
}

export interface ToolRequest {
  toolName: string;
  toolRequestId: string;
  inputs: Record<string, unknown>;
}

/**
 * Response envelope expected from extension endpoints.
 * Mirrors the ExtensionResponse format used by
 * diag-radex-extension-service's ExtensionClient.
 */
export interface ExtensionResponse {
  requestId: string;
  tools: ToolResponse[];
}

export interface ToolResponse {
  toolName: string;
  toolRequestId: string;
  outputs: Record<string, unknown>;
}

/**
 * Options for executing a tool call against a partner extension endpoint.
 */
export interface ExecuteToolOptions {
  tool: ManifestTool;
  inputs: Record<string, string>;
  customerTenantId: string;
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
  /** The parsed ExtensionResponse if the response matched the expected envelope. */
  extensionResponse?: ExtensionResponse;
  /** Raw response body (used when the response doesn't match the expected envelope). */
  rawBody?: unknown;
  /** The ExtensionRequest that was sent (for debugging/inspection). */
  sentRequest: ExtensionRequest;
}

/**
 * Builds an ExtensionRequest envelope matching the format used by
 * diag-radex-extension-service's ExtensionClient.CallExtensionAsync.
 *
 * The real service uses ExtensionClientMapper.ToExtensionRequest() which:
 * - Generates a new GUID for requestId
 * - Sets customerTenantId from the caller's tenant
 * - Creates a single ToolRequest with:
 *   - toolName from extension.Tools[0].Name
 *   - a new GUID for toolRequestId
 *   - inputs deserialized from the capability request, keys in camelCase
 */
export function buildExtensionRequest(
  tool: ManifestTool,
  inputs: Record<string, unknown>,
  customerTenantId: string,
): ExtensionRequest {
  return {
    requestId: randomUUID(),
    customerTenantId,
    tools: [
      {
        toolName: tool.name,
        toolRequestId: randomUUID(),
        inputs,
      },
    ],
  };
}

/**
 * Calls an extension endpoint mimicking diag-radex-extension-service's
 * ExtensionClient.CallExtensionAsync behavior:
 *
 * 1. Builds ExtensionRequest envelope
 * 2. Sets Accept: application/json header
 * 3. Optionally attaches Bearer token (in the real service this comes from
 *    EntraAuth client-credentials flow)
 * 4. POSTs JSON to tool.endpoint
 * 5. Expects ExtensionResponse envelope back
 */
export async function callExtensionAsync(
  options: ExecuteToolOptions,
): Promise<ExecuteToolResult> {
  const { tool, inputs, customerTenantId, bearerToken, timeoutMs = 30000 } = options;

  if (!tool.endpoint) {
    throw new Error('Tool endpoint is not configured.');
  }

  // Parse input values from strings to objects (mirrors the real service's
  // JSON deserialization of input values in ExtensionClientMapper)
  const parsedInputs = parseInputValues(inputs);

  const extensionRequest = buildExtensionRequest(tool, parsedInputs, customerTenantId);

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

  const requestBody = JSON.stringify(extensionRequest);
  log.info(`POST ${tool.endpoint} (timeout ${timeoutMs}ms)`);
  log.info(`Request headers: ${JSON.stringify(redactHeaders(headers))}`);
  log.info(
    `Request envelope: requestId=${extensionRequest.requestId}, ` +
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

    // Attempt to interpret as ExtensionResponse envelope
    let extensionResponse: ExtensionResponse | undefined;
    if (isExtensionResponse(rawBody)) {
      extensionResponse = rawBody;
      log.info(
        `Response matched ExtensionResponse envelope: ${extensionResponse.tools.length} tool result(s).`,
      );
    } else {
      log.warn('Response did not match the expected ExtensionResponse envelope; returning raw body.');
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      extensionResponse,
      rawBody: extensionResponse ? undefined : rawBody,
      sentRequest: extensionRequest,
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
 * Type guard to check if a response body matches the ExtensionResponse envelope.
 */
function isExtensionResponse(body: unknown): body is ExtensionResponse {
  if (body === null || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  return (
    typeof obj.requestId === 'string' &&
    Array.isArray(obj.tools) &&
    obj.tools.every(
      (t: unknown) =>
        t !== null &&
        typeof t === 'object' &&
        typeof (t as Record<string, unknown>).toolName === 'string' &&
        typeof (t as Record<string, unknown>).toolRequestId === 'string' &&
        (t as Record<string, unknown>).outputs !== null &&
        typeof (t as Record<string, unknown>).outputs === 'object',
    )
  );
}

