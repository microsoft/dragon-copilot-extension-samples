const DEFAULT_DESCRIPTION_FALLBACK = 'Clinical Application Connector';
const DESCRIPTION_SUFFIX = ' for Dragon Copilot healthcare data processing.';
const sanitizeName = (rawName) => {
    if (!rawName || !rawName.trim()) {
        return DEFAULT_DESCRIPTION_FALLBACK;
    }
    const spaced = rawName
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return spaced ? spaced.toUpperCase() : DEFAULT_DESCRIPTION_FALLBACK;
};
const ensureIntegrationSuffix = (upperCasedName) => {
    if (upperCasedName.endsWith(' INTEGRATION')) {
        return upperCasedName;
    }
    return `${upperCasedName} INTEGRATION`;
};
export const buildIntegrationDescription = (rawName) => {
    const upperName = sanitizeName(rawName);
    const prefixed = ensureIntegrationSuffix(upperName);
    return `${prefixed}${DESCRIPTION_SUFFIX}`;
};
//# sourceMappingURL=integration-description.js.map