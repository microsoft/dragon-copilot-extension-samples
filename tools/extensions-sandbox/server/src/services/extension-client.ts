import { randomUUID } from 'node:crypto';
import type { ManifestTool } from '../schemas/manifest.schema.js';

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
  const parsedInputs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(inputs)) {
    try {
      parsedInputs[key] = JSON.parse(value);
    } catch {
      // If not valid JSON, pass as-is (string)
      parsedInputs[key] = value;
    }
  }

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(tool.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(extensionRequest),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const contentType = response.headers.get('content-type') || '';

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
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      extensionResponse,
      rawBody: extensionResponse ? undefined : rawBody,
      sentRequest: extensionRequest,
    };
  } finally {
    clearTimeout(timeout);
  }
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
        typeof (t as Record<string, unknown>).toolName === 'string',
    )
  );
}
