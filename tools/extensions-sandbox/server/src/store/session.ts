import type { ExtensionManifest } from '../schemas/manifest.schema.js';

/**
 * In-memory global store for the sandbox.
 * Stores the currently loaded manifest for use across API endpoints.
 *
 * NOTE: This is a module-level singleton with no session isolation.
 * It is designed for single-user local development only. If multi-user
 * support is ever needed, state must be keyed by a session identifier.
 */
class SessionStore {
  private manifest: ExtensionManifest | null = null;

  setManifest(manifest: ExtensionManifest): void {
    this.manifest = manifest;
  }

  getManifest(): ExtensionManifest | null {
    return this.manifest;
  }

  clear(): void {
    this.manifest = null;
  }
}

export const sessionStore = new SessionStore();
