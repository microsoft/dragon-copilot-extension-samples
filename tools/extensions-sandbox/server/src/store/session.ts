import type { ExtensionManifest } from '../schemas/manifest.schema.js';
import type { ValidationResult } from '../services/validation.js';

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

  clear(): void {
    this.manifest = null;
    this.rawManifestText = null;
    this.validationResults = [];
  }
}

export const sessionStore = new SessionStore();
