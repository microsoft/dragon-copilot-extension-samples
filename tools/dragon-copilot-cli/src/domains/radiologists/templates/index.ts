/**
 * Built-in radiologists templates.
 *
 * The template registry lives in the pure manifest core (`../manifest/templates.ts`)
 * so the Extensions Sandbox can offer the same templates; this module keeps the
 * existing `../templates/index.js` import path working.
 */
export { getTemplate, listTemplates, listTemplateSummaries } from '../manifest/templates.js';
export type { TemplateSummary } from '../manifest/templates.js';
