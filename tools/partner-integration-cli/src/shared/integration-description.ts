const DEFAULT_DESCRIPTION_FALLBACK = 'PARTNER INTEGRATION';
const DESCRIPTION_SUFFIX = ' for Dragon Copilot healthcare data processing.';

const sanitizeName = (rawName?: string): string => {
  if (!rawName || !rawName.trim()) {
    return DEFAULT_DESCRIPTION_FALLBACK;
  }

  const spaced = rawName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced ? spaced.toUpperCase() : DEFAULT_DESCRIPTION_FALLBACK;
};

const ensureIntegrationSuffix = (upperCasedName: string): string => {
  if (upperCasedName.endsWith(' INTEGRATION')) {
    return upperCasedName;
  }
  return `${upperCasedName} INTEGRATION`;
};

export const buildIntegrationDescription = (rawName: string): string => {
  const upperName = sanitizeName(rawName);
  const prefixed = ensureIntegrationSuffix(upperName);
  return `${prefixed}${DESCRIPTION_SUFFIX}`;
};
