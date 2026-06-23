import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  acquireToken,
  clearTokenCache,
  decodeJwtClaims,
  normalizeScope,
  buildClaimChecks,
  resolveTokenEndpoint,
  AuthError,
  RADIANCE_CLIENT_ID,
  type AuthConfig,
} from '../services/auth.js';

/** Builds an unsigned JWT (header.payload.signature) for claims-decode tests. */
function makeJwt(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.sig`;
}

const validConfig: AuthConfig = {
  enabled: true,
  tenantId: '046cf90e-9c12-4b4d-a3ba-21bb36243446',
  clientId: RADIANCE_CLIENT_ID,
  clientSecret: 'super-secret',
  scope: 'api://046cf90e-9c12-4b4d-a3ba-21bb36243446/ext.contoso.com',
};

/** Mocks the global fetch with a successful Entra token response. */
function mockTokenResponse(claims: Record<string, unknown>, expiresIn = 3600) {
  const token = makeJwt(claims);
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' }),
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, token };
}

describe('normalizeScope', () => {
  it('appends /.default to a bare Application ID URI', () => {
    expect(normalizeScope('api://tenant/ext.contoso.com')).toBe(
      'api://tenant/ext.contoso.com/.default',
    );
  });

  it('leaves an existing /.default scope unchanged', () => {
    expect(normalizeScope('api://tenant/ext.contoso.com/.default')).toBe(
      'api://tenant/ext.contoso.com/.default',
    );
  });

  it('trims a trailing slash before appending', () => {
    expect(normalizeScope('api://tenant/ext.contoso.com/')).toBe(
      'api://tenant/ext.contoso.com/.default',
    );
  });
});

describe('resolveTokenEndpoint', () => {
  afterEach(() => {
    delete process.env.ENTRA_TOKEN_ENDPOINT;
  });

  it('targets the public Entra cloud by default', () => {
    delete process.env.ENTRA_TOKEN_ENDPOINT;
    expect(resolveTokenEndpoint('tid')).toBe(
      'https://login.microsoftonline.com/tid/oauth2/v2.0/token',
    );
  });

  it('uses the ENTRA_TOKEN_ENDPOINT override verbatim when set', () => {
    process.env.ENTRA_TOKEN_ENDPOINT = 'http://localhost:9200/token';
    expect(resolveTokenEndpoint('tid')).toBe('http://localhost:9200/token');
  });

  it('substitutes the {tenantId} placeholder in the override', () => {
    process.env.ENTRA_TOKEN_ENDPOINT = 'http://localhost:9200/{tenantId}/token';
    expect(resolveTokenEndpoint('tid')).toBe('http://localhost:9200/tid/token');
  });
});

describe('decodeJwtClaims', () => {  it('decodes iss/idtyp/azp from a JWT payload', () => {
    const token = makeJwt({ iss: 'https://issuer', idtyp: 'app', azp: RADIANCE_CLIENT_ID });
    const claims = decodeJwtClaims(token);
    expect(claims.iss).toBe('https://issuer');
    expect(claims.idtyp).toBe('app');
    expect(claims.azp).toBe(RADIANCE_CLIENT_ID);
  });

  it('returns empty claims for a malformed token', () => {
    expect(decodeJwtClaims('not-a-jwt')).toEqual({});
  });
});

describe('buildClaimChecks', () => {
  it('passes when claims match the expected Radiance values', () => {
    const claims = {
      iss: `https://login.microsoftonline.com/${validConfig.tenantId}/v2.0`,
      idtyp: 'app',
      azp: RADIANCE_CLIENT_ID,
    };
    const checks = buildClaimChecks(claims, validConfig.tenantId);
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it('fails the azp check when the calling app differs', () => {
    const checks = buildClaimChecks({ azp: 'some-other-app' }, validConfig.tenantId);
    const azp = checks.find((c) => c.claim === 'azp');
    expect(azp?.passed).toBe(false);
    expect(azp?.actual).toBe('some-other-app');
  });

  it('derives the expected issuer from the token tid when a tenant domain is configured', () => {
    const tid = validConfig.tenantId;
    const checks = buildClaimChecks(
      { iss: `https://login.microsoftonline.com/${tid}/v2.0`, tid },
      'contoso.onmicrosoft.com',
    );
    const iss = checks.find((c) => c.claim === 'iss');
    expect(iss?.passed).toBe(true);
    expect(iss?.expected).toBe(`https://login.microsoftonline.com/${tid}/v2.0`);
  });

  it('cannot verify the issuer when a domain tenant is configured and tid is absent', () => {
    const checks = buildClaimChecks(
      { iss: 'https://login.microsoftonline.com/some-guid/v2.0' },
      'contoso.onmicrosoft.com',
    );
    const iss = checks.find((c) => c.claim === 'iss');
    expect(iss?.passed).toBe(false);
    expect(iss?.expected).toContain('enter the tenant GUID');
  });
});

describe('acquireToken', () => {
  beforeEach(() => {
    clearTokenCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('acquires a token via the client credentials grant', async () => {
    const { fetchMock, token } = mockTokenResponse({ idtyp: 'app', azp: RADIANCE_CLIENT_ID });

    const result = await acquireToken(validConfig);

    expect(result.accessToken).toBe(token);
    expect(result.expiresOnMs).toBeGreaterThan(Date.now());
    expect(result.claims.azp).toBe(RADIANCE_CLIENT_ID);

    // Verify the request shape: token endpoint + client_credentials grant + .default scope.
    const [url, init] = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(String(url)).toContain(`/${validConfig.tenantId}/oauth2/v2.0/token`);
    const body = String((init as RequestInit).body);
    expect(body).toContain('grant_type=client_credentials');
    expect(body).toContain('scope=api%3A%2F%2F'); // url-encoded api://
    expect(body).toContain('.default');
  });

  it('caches the token and does not refetch within its lifetime', async () => {
    const { fetchMock } = mockTokenResponse({ azp: RADIANCE_CLIENT_ID });

    const first = await acquireToken(validConfig);
    const second = await acquireToken(validConfig);

    expect(second.accessToken).toBe(first.accessToken);
    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(1);
  });

  it('refetches when the cached token is near expiry', async () => {
    // expires_in of 30s is below the 60s skew, so the cache entry is never reused.
    const { fetchMock } = mockTokenResponse({ azp: RADIANCE_CLIENT_ID }, 30);

    await acquireToken(validConfig);
    await acquireToken(validConfig);

    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(2);
  });

  it('forceRefresh bypasses the cache', async () => {
    const { fetchMock } = mockTokenResponse({ azp: RADIANCE_CLIENT_ID });

    await acquireToken(validConfig);
    await acquireToken(validConfig, { forceRefresh: true });

    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(2);
  });

  it('noCache neither reads nor writes the shared token cache', async () => {
    const { fetchMock } = mockTokenResponse({ azp: RADIANCE_CLIENT_ID });

    // A noCache acquisition must not seed the cache...
    await acquireToken(validConfig, { noCache: true });
    // ...so a subsequent cached acquisition still has to fetch.
    await acquireToken(validConfig);
    // ...and a later noCache acquisition must ignore that cached entry.
    await acquireToken(validConfig, { noCache: true });

    expect((fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(3);
  });

  it('adds a ".default" hint to invalid_scope troubleshooting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_scope', error_description: 'bad scope' }),
      })) as unknown as typeof fetch,
    );

    const err = await acquireToken(validConfig).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.category).toBe('invalid_scope');
    expect(err.troubleshooting[0]).toContain('.default');
  });

  it('honors the ENTRA_TOKEN_ENDPOINT override for the token request', async () => {
    process.env.ENTRA_TOKEN_ENDPOINT = 'http://localhost:9200/fake/token';
    try {
      const { fetchMock } = mockTokenResponse({ azp: RADIANCE_CLIENT_ID });
      await acquireToken(validConfig);
      const [url] = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
      expect(String(url)).toBe('http://localhost:9200/fake/token');
    } finally {
      delete process.env.ENTRA_TOKEN_ENDPOINT;
    }
  });

  it('throws invalid_config when required fields are missing', async () => {
    await expect(
      acquireToken({ ...validConfig, clientSecret: '' }),
    ).rejects.toMatchObject({ category: 'invalid_config' });
  });

  it('maps an invalid_client token error to AuthError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'invalid_client',
          error_description: 'AADSTS7000215: Invalid client secret provided.',
        }),
      })) as unknown as typeof fetch,
    );

    const err = await acquireToken(validConfig).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.category).toBe('invalid_client');
    expect(err.entraCode).toBe('invalid_client');
  });

  it('maps a network failure to a network AuthError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('getaddrinfo ENOTFOUND login.microsoftonline.com');
      }) as unknown as typeof fetch,
    );

    const err = await acquireToken(validConfig).catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.category).toBe('network');
  });

  it('never includes the client secret in error messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_scope', error_description: 'bad scope' }),
      })) as unknown as typeof fetch,
    );

    const err = await acquireToken(validConfig).catch((e) => e);
    expect(err.message).not.toContain(validConfig.clientSecret);
    expect(JSON.stringify(err.troubleshooting)).not.toContain(validConfig.clientSecret);
  });
});
