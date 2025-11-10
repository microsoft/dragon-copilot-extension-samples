import type { ContextRetrievalItem, YesNo } from '../types.js';

export interface ContextItemCatalogEntry {
  name: string;
  type: ContextRetrievalItem['type'];
  description: string;
  defaultRequired: YesNo;
  defaultInclude: boolean;
}

const RAW_CONTEXT_ITEM_CATALOG: ContextItemCatalogEntry[] = [
  {
    name: 'base_url',
    type: 'url',
    description: 'base url need for API calls.  These are typically FHIR calls.',
    defaultRequired: 'yes',
    defaultInclude: true
  },
  {
    name: 'ehr-user_id',
    type: 'string',
    description: 'optional EHR user id for FHIR API calls.',
    defaultRequired: 'no',
    defaultInclude: true
  },
  {
    name: 'in-bound-client-id',
    type: 'string',
    description: 'credential for inbound calls to interop',
    defaultRequired: 'yes',
    defaultInclude: true
  },
  {
    name: 'in-bound-issuer',
    type: 'url',
    description: 'issuer claim of access tokens used by the partner to call Dragon Copilot Interop',
    defaultRequired: 'yes',
    defaultInclude: true
  },
  {
    name: 'out-bound-issuer',
    type: 'url',
    description: 'endpoint used to issue access token for Dragon Copilot Interop to call partner',
    defaultRequired: 'yes',
    defaultInclude: true
  },
  {
    name: 'out-bound-client-id',
    type: 'string',
    description: 'Partner-provided client ID used to issue access tokens for Dragon Copilot Interop to call the partner',
    defaultRequired: 'yes',
    defaultInclude: true
  },
  {
    name: 'out-bound-secret',
    type: 'string',
    description: 'Partner-provided secret used to issue access tokens for Dragon Copilot Interop to call the partner',
    defaultRequired: 'yes',
    defaultInclude: true
  }
];

export const CONTEXT_ITEM_CATALOG: ReadonlyArray<ContextItemCatalogEntry> = RAW_CONTEXT_ITEM_CATALOG.map(
  entry => Object.freeze({ ...entry })
);

const CONTEXT_ITEM_MAP = new Map(CONTEXT_ITEM_CATALOG.map(entry => [entry.name, entry]));

export const REQUIRED_CONTEXT_ITEM_NAMES: ReadonlyArray<string> = CONTEXT_ITEM_CATALOG.filter(
  entry => entry.defaultInclude
).map(entry => entry.name);

export function getContextItemDefinition(name: string): ContextItemCatalogEntry | undefined {
  return CONTEXT_ITEM_MAP.get(name);
}

export function cloneContextItem(name: string): ContextRetrievalItem | undefined {
  const definition = CONTEXT_ITEM_MAP.get(name);
  if (!definition) {
    return undefined;
  }

  return {
    name: definition.name,
    type: definition.type,
    description: definition.description,
    required: definition.defaultRequired
  };
}

export function getDefaultContextItems(): ContextRetrievalItem[] {
  return REQUIRED_CONTEXT_ITEM_NAMES.map(name => cloneContextItem(name)!).filter(
    (item): item is ContextRetrievalItem => Boolean(item)
  );
}
