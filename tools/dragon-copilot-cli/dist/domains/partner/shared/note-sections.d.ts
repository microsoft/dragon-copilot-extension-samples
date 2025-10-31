import type { NoteSectionValue } from '../types.js';
export declare const NOTE_SECTION_ORDER: readonly ["hpi", "chief-complaint", "past-medical-history", "assessment", "medications", "allergies", "review-of-systems", "physical-exam", "procedures", "results"];
export type NoteSectionKey = (typeof NOTE_SECTION_ORDER)[number];
export declare const NOTE_SECTION_LABELS: Record<NoteSectionKey, string>;
export declare const EMPTY_NOTE_PLACEHOLDER = "__NOTE_EMPTY__";
export declare const normalizeNoteSections: (input?: Record<string, NoteSectionValue>) => Record<NoteSectionKey, NoteSectionValue>;
export declare const getDefaultNoteSections: () => Record<NoteSectionKey, NoteSectionValue>;
//# sourceMappingURL=note-sections.d.ts.map