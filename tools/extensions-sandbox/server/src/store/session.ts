import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import type { ValidationResult } from '../services/validation.js';
import type { AuthConfig, SafeAuthConfig } from '../services/auth.js';
import { RADIANCE_CLIENT_ID } from '../services/auth.js';

/**
 * In-memory global store for the sandbox.
 * Stores the currently loaded manifest and validation results for use
 * across API endpoints.
 *
 * NOTE: This is a module-level singleton with no session isolation.
 * It is designed for single-user local development only. If multi-user
 * support is ever needed, state must be keyed by a session identifier.
 */
class SessionStore {
  private manifest: ExtensionManifest | null = null;
  private rawManifestText: string | null = null;
  private validationResults: ValidationResult[] = [];
  /**
   * Authentication config for service-to-service calls to the extension
   * endpoint. The client secret is held in memory only and is never returned
   * to the client (see getSafeAuthConfig).
   */
  private authConfig: AuthConfig = {
    enabled: false,
    tenantId: '',
    clientId: RADIANCE_CLIENT_ID,
    clientSecret: '',
    scope: '',
  };

  setManifest(manifest: ExtensionManifest, rawText?: string): void {
    this.manifest = manifest;
    this.rawManifestText = rawText ?? null;
    // Clear stale validation results when a new manifest is loaded
    this.validationResults = [];
  }

  getManifest(): ExtensionManifest | null {
    return this.manifest;
  }

  getRawManifestText(): string | null {
    return this.rawManifestText;
  }

  setRawManifestText(text: string): void {
    this.rawManifestText = text;
  }

  addValidationResult(result: ValidationResult): void {
    this.validationResults.push(result);
  }

  getValidationResults(): ValidationResult[] {
    return [...this.validationResults];
  }

  clearValidationResults(): void {
    this.validationResults = [];
  }

  /** Returns the full auth config (including secret) for server-side use only. */
  getAuthConfig(): AuthConfig {
    return { ...this.authConfig };
  }

  /**
   * Updates the auth config. A blank/undefined clientSecret preserves the
   * existing stored secret so the client can update other fields without
   * re-sending the secret (which it never receives back).
   */
  setAuthConfig(update: Partial<AuthConfig>): void {
    const next: AuthConfig = { ...this.authConfig, ...update };
    if (update.clientSecret === undefined || update.clientSecret === '') {
      next.clientSecret = this.authConfig.clientSecret;
    }
    if (!next.clientId?.trim()) {
      next.clientId = RADIANCE_CLIENT_ID;
    }
    this.authConfig = next;
  }

  /** Returns a redacted auth config that is safe to send to the client. */
  getSafeAuthConfig(): SafeAuthConfig {
    return {
      enabled: this.authConfig.enabled,
      tenantId: this.authConfig.tenantId,
      clientId: this.authConfig.clientId,
      scope: this.authConfig.scope,
      hasSecret: this.authConfig.clientSecret.length > 0,
    };
  }

  clear(): void {
    this.manifest = null;
    this.rawManifestText = null;
    this.validationResults = [];
  }
}

export const sessionStore = new SessionStore();
