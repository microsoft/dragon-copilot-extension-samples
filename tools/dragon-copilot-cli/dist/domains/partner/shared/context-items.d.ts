import type { ContextRetrievalItem, YesNo } from '../types.js';
export interface ContextItemCatalogEntry {
    name: string;
    type: ContextRetrievalItem['type'];
    description: string;
    defaultRequired: YesNo;
    defaultInclude: boolean;
}
export declare const CONTEXT_ITEM_CATALOG: ReadonlyArray<ContextItemCatalogEntry>;
export declare const REQUIRED_CONTEXT_ITEM_NAMES: ReadonlyArray<string>;
export declare function getContextItemDefinition(name: string): ContextItemCatalogEntry | undefined;
export declare function cloneContextItem(name: string): ContextRetrievalItem | undefined;
export declare function getDefaultContextItems(): ContextRetrievalItem[];
//# sourceMappingURL=context-items.d.ts.map