/**
 * Entra ID service-to-service (client credentials) authentication for the
 * sandbox. Mirrors the Radiance-to-Extension authentication scheme: the
 * sandbox acquires an OAuth 2.0 access token from Microsoft Entra ID using
 * the client credentials grant, then attaches it as a Bearer token when
 * calling the partner extension endpoint.
 *
 * SECURITY: client secrets are never logged. Only non-sensitive metadata
 * (tenant id, client id, scope, expiry) may appear in errors/logs.
 */

/** The Radiance (Dragon Copilot radiologists) Entra application client id. */
export const RADIANCE_CLIENT_ID = '7c2215ec-e1fa-4aa6-9204-8ee91e63d29f';

/** Authentication configuration supplied by the partner developer. */
export interface AuthConfig {
  /** Whether the sandbox should authenticate calls to the extension endpoint. */
  enabled: boolean;
  /** Entra tenant id that issues the token (the partner tenant). */
  tenantId: string;
  /** Client id of the calling app (defaults to the Radiance client id). */
  clientId: string;
  /** Client secret of the calling app. Write-only; never returned by the API. */
  clientSecret: string;
  /**
   * The partner extension's Application ID URI / scope. Accepts either a bare
   * Application ID URI (e.g. "api://{tenant}/ext.contoso.com") — ".default" is
   * appended automatically — or a full scope already ending in "/.default".
   */
  scope: string;
}

/** A redacted view of {@link AuthConfig} that is safe to return to the client. */
export interface SafeAuthConfig {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  scope: string;
  /** True when a secret is currently stored (the value itself is never sent). */
  hasSecret: boolean;
}

/** A subset of JWT claims surfaced for validation guidance in the UI. */
export interface TokenClaims {
  iss?: string;
  idtyp?: string;
  azp?: string;
  appid?: string;
  aud?: string;
  exp?: number;
  /** The tenant id (GUID) the token was issued for. */
  tid?: string;
}

export interface AcquireTokenResult {
  accessToken: string;
  /** Epoch milliseconds at which the token expires. */
  expiresOnMs: number;
  /** Decoded (NOT signature-verified) claims, for UI guidance only. */
  claims: TokenClaims;
}

/** Error categories surfaced to the caller for actionable messages. */
export type AuthErrorCategory =
  | 'invalid_config'
  | 'invalid_client'
  | 'invalid_scope'
  | 'network'
  | 'token_endpoint_error';

export class AuthError extends Error {
  category: AuthErrorCategory;
  /** The Entra error code (e.g. "invalid_client", "AADSTS7000215") when available. */
  entraCode?: string;
  troubleshooting: string[];

  constructor(
    message: string,
    category: AuthErrorCategory,
    troubleshooting: string[] = [],
    entraCode?: string,
  ) {
    super(message);
    this.name = 'AuthError';
    this.category = category;
    this.entraCode = entraCode;
    this.troubleshooting = troubleshooting;
  }
}

/**
 * Decodes the payload of a JWT WITHOUT verifying its signature. This is used
 * purely to surface claims (iss/idtyp/azp) as validation guidance in the UI —
 * it must never be relied upon for security decisions.
 */
export function decodeJwtClaims(token: string): TokenClaims {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payload, 'base64').toString('utf-8');
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      iss: typeof claims.iss === 'string' ? claims.iss : undefined,
      idtyp: typeof claims.idtyp === 'string' ? claims.idtyp : undefined,
      azp: typeof claims.azp === 'string' ? claims.azp : undefined,
      appid: typeof claims.appid === 'string' ? claims.appid : undefined,
      aud: typeof claims.aud === 'string' ? claims.aud : undefined,
      exp: typeof claims.exp === 'number' ? claims.exp : undefined,
      tid: typeof claims.tid === 'string' ? claims.tid : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Normalizes a configured scope into a full ".default" scope as required by
 * the client credentials flow. Accepts either a bare Application ID URI or a
 * scope that already ends in "/.default".
 */
export function normalizeScope(scope: string): string {
  const trimmed = scope.trim();
  if (trimmed.endsWith('/.default')) return trimmed;
  return `${trimmed.replace(/\/$/, '')}/.default`;
}

function validateConfig(config: AuthConfig): void {
  const missing: string[] = [];
  if (!config.tenantId?.trim()) missing.push('tenantId');
  if (!config.clientId?.trim()) missing.push('clientId');
  if (!config.clientSecret?.trim()) missing.push('clientSecret');
  if (!config.scope?.trim()) missing.push('scope');
  if (missing.length > 0) {
    throw new AuthError(
      `Authentication is enabled but the following configuration value(s) are missing: ${missing.join(', ')}.`,
      'invalid_config',
      ['Provide all required authentication fields in the sandbox auth settings.'],
    );
  }
}

interface CacheEntry {
  accessToken: string;
  expiresOnMs: number;
  claims: TokenClaims;
}

/** Clock-skew safety margin: refresh a token this many ms before it expires. */
const EXPIRY_SKEW_MS = 60_000;

const tokenCache = new Map<string, CacheEntry>();

function cacheKey(config: AuthConfig, scope: string): string {
  return `${config.tenantId}|${config.clientId}|${scope}`;
}

/** Clears the in-memory token cache (used by tests and on config changes). */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Resolves the OAuth 2.0 token endpoint for a tenant.
 *
 * By default this targets the public Microsoft Entra cloud. For local/offline
 * end-to-end testing, set the `ENTRA_TOKEN_ENDPOINT` environment variable to
 * point token acquisition at a fake issuer instead. The value may contain a
 * literal `{tenantId}` placeholder, which is replaced with the configured
 * tenant id (otherwise the URL is used as-is).
 */
export function resolveTokenEndpoint(tenantId: string): string {
  const override = process.env.ENTRA_TOKEN_ENDPOINT?.trim();
  if (override) {
    return override.includes('{tenantId}')
      ? override.replace('{tenantId}', encodeURIComponent(tenantId))
      : override;
  }
  return `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId,
  )}/oauth2/v2.0/token`;
}

/**
 * Acquires an Entra ID access token via the client credentials grant, caching
 * the result until shortly before expiry. Pass `forceRefresh` to bypass the
 * cache read (a freshly acquired token is still written to the cache). Pass
 * `noCache` to skip the cache entirely — neither reading nor writing it — which
 * is used by the "Test connection" path so an ad-hoc test cannot seed the cache
 * that real executions read from (the cache key intentionally omits the secret).
 */
export async function acquireToken(
  config: AuthConfig,
  options: { forceRefresh?: boolean; timeoutMs?: number; noCache?: boolean } = {},
): Promise<AcquireTokenResult> {
  validateConfig(config);

  const scope = normalizeScope(config.scope);
  const key = cacheKey(config, scope);
  const now = Date.now();

  if (!options.forceRefresh && !options.noCache) {
    const cached = tokenCache.get(key);
    if (cached && cached.expiresOnMs - EXPIRY_SKEW_MS > now) {
      return {
        accessToken: cached.accessToken,
        expiresOnMs: cached.expiresOnMs,
        claims: cached.claims,
      };
    }
  }

  const tokenUrl = resolveTokenEndpoint(config.tenantId);

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    throw new AuthError(
      `Could not reach the Microsoft Entra token endpoint: ${message}`,
      'network',
      [
        'Verify the machine has network access to login.microsoftonline.com.',
        'Check the tenant id is correct.',
      ],
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const entraCode =
      typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
    const description =
      typeof payload.error_description === 'string'
        ? // The Entra error_description can be multi-line; keep the first line.
          payload.error_description.split('\n')[0]
        : `Token request failed with status ${response.status}.`;

    const category: AuthErrorCategory =
      entraCode === 'invalid_client'
        ? 'invalid_client'
        : entraCode === 'invalid_scope'
          ? 'invalid_scope'
          : 'token_endpoint_error';

    const troubleshooting = [
      'Confirm the tenant id, client id, and client secret are correct.',
      'Confirm the partner extension app exposes the configured Application ID URI / scope.',
      'Ensure the service principal for the calling app exists in the partner tenant.',
    ];
    if (category === 'invalid_scope') {
      // The most common invalid_scope cause is passing a delegated permission
      // scope; client credentials only accepts an Application ID URI / ".default".
      troubleshooting.unshift(
        'Client credentials requires an Application ID URI or a "/.default" scope (e.g. api://.../.default), not a delegated permission scope.',
      );
    }

    throw new AuthError(`Entra token request failed: ${description}`, category, troubleshooting, entraCode);
  }

  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
  if (!accessToken) {
    throw new AuthError(
      'Entra token response did not contain an access_token.',
      'token_endpoint_error',
    );
  }

  const expiresInSec = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
  const expiresOnMs = now + expiresInSec * 1000;
  const claims = decodeJwtClaims(accessToken);

  if (!options.noCache) {
    tokenCache.set(key, { accessToken, expiresOnMs, claims });
  }

  return { accessToken, expiresOnMs, claims };
}

/**
 * Produces non-blocking claims-validation guidance comparing decoded token
 * claims against the values an extension is expected to validate (per the
 * Partner Extension Authentication spec). Never used for enforcement.
 */
export interface ClaimCheck {
  claim: string;
  expected: string;
  actual?: string;
  passed: boolean;
}

/** Matches a tenant id in GUID form (vs. a tenant domain like contoso.onmicrosoft.com). */
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildClaimChecks(claims: TokenClaims, tenantId: string): ClaimCheck[] {
  // A token's `iss` always uses the tenant GUID. If the configured tenantId is a
  // GUID, compare against it directly (a genuine cross-check). If a tenant
  // *domain* was entered, the GUID isn't known locally, so derive the expected
  // issuer from the token's own `tid` claim — otherwise a valid token would show
  // a misleading mismatch against a domain-based expected value.
  const trimmedTenant = tenantId.trim();
  const issuerTenant = GUID_RE.test(trimmedTenant) ? trimmedTenant : claims.tid;
  const expectedIss = issuerTenant
    ? `https://login.microsoftonline.com/${issuerTenant}/v2.0`
    : undefined;
  const azp = claims.azp ?? claims.appid;
  return [
    {
      claim: 'iss',
      expected: expectedIss ?? '(enter the tenant GUID to verify the issuer)',
      actual: claims.iss,
      passed: expectedIss !== undefined && claims.iss === expectedIss,
    },
    {
      claim: 'idtyp',
      expected: 'app',
      actual: claims.idtyp,
      // idtyp is only present for app-only tokens; treat absence as informational.
      passed: claims.idtyp === 'app',
    },
    {
      claim: 'azp',
      expected: RADIANCE_CLIENT_ID,
      actual: azp,
      passed: azp === RADIANCE_CLIENT_ID,
    },
  ];
}
