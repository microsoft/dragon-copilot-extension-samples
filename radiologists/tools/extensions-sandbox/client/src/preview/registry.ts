import { extensionApiProvider } from './extension-api-provider';
import type { PreviewContext, PreviewModel, ResultProvider, ResultSource } from './types';

/**
 * Placeholder provider for a source that is part of the preview's design but not
 * yet implemented. Declaring it here keeps the pane's source switching honest —
 * the UI can list and disable it without special-casing unknown sources.
 */
function plannedProvider(
  source: ResultSource,
  label: string,
  description: string,
): ResultProvider {
  return {
    source,
    label,
    description,
    available: false,
    buildPreview: (): PreviewModel | null => null,
  };
}

/**
 * Pixel-based AI apps will return image/overlay style results. Rendering those is
 * out of scope today; the provider exists so the source can be added without
 * reworking the pane.
 */
export const pixelAiProvider = plannedProvider(
  'pixel-ai',
  'Pixel AI app',
  'Image and overlay results returned by pixel-based imaging AI applications.',
);

/** PowerScribe results, for side-by-side comparison with extension output. */
export const powerScribeProvider = plannedProvider(
  'powerscribe',
  'PowerScribe',
  'Results surfaced from PowerScribe alongside extension output.',
);

function defaultProviders(): ResultProvider[] {
  return [extensionApiProvider, pixelAiProvider, powerScribeProvider];
}

const providers = new Map<ResultSource, ResultProvider>(
  defaultProviders().map((provider) => [provider.source, provider]),
);

/** Registers (or replaces) a provider for a result source. */
export function registerResultProvider(provider: ResultProvider): void {
  providers.set(provider.source, provider);
}

/**
 * Restores the built-in providers. The registry is module-level mutable state, so
 * without this a provider registered by one test leaks into every later test in
 * the same process.
 */
export function resetResultProviders(): void {
  providers.clear();
  for (const provider of defaultProviders()) {
    providers.set(provider.source, provider);
  }
}

export function getResultProvider(source: ResultSource): ResultProvider | undefined {
  return providers.get(source);
}

/** All known sources, including those that are declared but not yet available. */
export function listResultProviders(): ResultProvider[] {
  return [...providers.values()];
}

/**
 * Builds the preview for a source. Returns `null` when the source is unknown, not
 * yet available, or has nothing to show — all of which the pane renders as its
 * empty state.
 */
export function buildPreview(
  source: ResultSource,
  input: unknown,
  context: PreviewContext = {},
): PreviewModel | null {
  const provider = providers.get(source);
  if (!provider || !provider.available) return null;
  return provider.buildPreview(input, context);
}
