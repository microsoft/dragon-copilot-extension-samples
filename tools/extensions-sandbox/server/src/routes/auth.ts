import { Router } from 'express';
import { sessionStore } from '../store/session.js';
import {
  acquireToken,
  buildClaimChecks,
  clearTokenCache,
  AuthError,
  type AuthConfig,
} from '../services/auth.js';

export const authRouter = Router();

/**
 * GET /api/auth/config
 * Returns the current auth configuration WITHOUT the client secret.
 */
authRouter.get('/config', (_req, res) => {
  res.json(sessionStore.getSafeAuthConfig());
});

/**
 * POST /api/auth/config
 * Updates the auth configuration. An empty/omitted clientSecret preserves the
 * previously stored secret. Updating config clears the token cache so the next
 * execution acquires a fresh token.
 *
 * Body: Partial<AuthConfig>
 */
authRouter.post('/config', (req, res) => {
  const body = (req.body ?? {}) as Partial<AuthConfig>;

  const update: Partial<AuthConfig> = {};
  if (typeof body.enabled === 'boolean') update.enabled = body.enabled;
  if (typeof body.tenantId === 'string') update.tenantId = body.tenantId.trim();
  if (typeof body.clientId === 'string') update.clientId = body.clientId.trim();
  if (typeof body.clientSecret === 'string') update.clientSecret = body.clientSecret;
  if (typeof body.scope === 'string') update.scope = body.scope.trim();

  sessionStore.setAuthConfig(update);
  clearTokenCache();

  res.json(sessionStore.getSafeAuthConfig());
});

/**
 * POST /api/auth/test
 * Acquires a token using the current (or supplied) configuration and reports
 * success/expiry plus claims-validation guidance — WITHOUT calling any
 * extension endpoint. The access token itself is never returned.
 */
authRouter.post('/test', async (req, res) => {
  // Allow testing with the stored config, or with an ad-hoc config in the body.
  const stored = sessionStore.getAuthConfig();
  const body = (req.body ?? {}) as Partial<AuthConfig>;
  const config: AuthConfig = {
    enabled: true,
    tenantId: typeof body.tenantId === 'string' && body.tenantId ? body.tenantId : stored.tenantId,
    clientId: typeof body.clientId === 'string' && body.clientId ? body.clientId : stored.clientId,
    // A supplied secret is used as-is; otherwise fall back to the stored secret.
    clientSecret:
      typeof body.clientSecret === 'string' && body.clientSecret
        ? body.clientSecret
        : stored.clientSecret,
    scope: typeof body.scope === 'string' && body.scope ? body.scope : stored.scope,
  };

  try {
    // noCache: a "Test connection" must not seed the cache that real executions
    // read from (the cache key omits the secret, so an ad-hoc test secret could
    // otherwise serve a token to /execute).
    const result = await acquireToken(config, { noCache: true });
    res.json({
      success: true,
      expiresOnMs: result.expiresOnMs,
      claimChecks: buildClaimChecks(result.claims, config.tenantId),
    });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      res.status(400).json({
        success: false,
        error: err.message,
        category: err.category,
        entraCode: err.entraCode,
        troubleshooting: err.troubleshooting,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
