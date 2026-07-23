import { describe, it, expect, beforeEach } from 'vitest';
import { sessionStore } from '../store/session.js';
import { RADIANCE_CLIENT_ID } from '../services/auth.js';

describe('sessionStore auth config', () => {
  beforeEach(() => {
    // Reset to a known baseline before each test.
    sessionStore.setAuthConfig({
      enabled: false,
      tenantId: '',
      clientId: RADIANCE_CLIENT_ID,
      clientSecret: '',
      scope: '',
    });
  });

  it('defaults clientId to the Radiance client id', () => {
    const safe = sessionStore.getSafeAuthConfig();
    expect(safe.clientId).toBe(RADIANCE_CLIENT_ID);
    expect(safe.hasSecret).toBe(false);
  });

  it('never exposes the client secret via getSafeAuthConfig', () => {
    sessionStore.setAuthConfig({ clientSecret: 'top-secret', tenantId: 't1' });
    const safe = sessionStore.getSafeAuthConfig() as unknown as Record<string, unknown>;
    expect(safe.clientSecret).toBeUndefined();
    expect(safe.hasSecret).toBe(true);
    expect(JSON.stringify(safe)).not.toContain('top-secret');
  });

  it('preserves the stored secret when an empty secret is provided', () => {
    sessionStore.setAuthConfig({ clientSecret: 'keep-me' });
    sessionStore.setAuthConfig({ tenantId: 't2', clientSecret: '' });

    expect(sessionStore.getAuthConfig().clientSecret).toBe('keep-me');
    expect(sessionStore.getAuthConfig().tenantId).toBe('t2');
  });

  it('overwrites the secret when a new non-empty secret is provided', () => {
    sessionStore.setAuthConfig({ clientSecret: 'old' });
    sessionStore.setAuthConfig({ clientSecret: 'new' });
    expect(sessionStore.getAuthConfig().clientSecret).toBe('new');
  });

  it('falls back to the Radiance client id when cleared to blank', () => {
    sessionStore.setAuthConfig({ clientId: '' });
    expect(sessionStore.getAuthConfig().clientId).toBe(RADIANCE_CLIENT_ID);
  });
});
