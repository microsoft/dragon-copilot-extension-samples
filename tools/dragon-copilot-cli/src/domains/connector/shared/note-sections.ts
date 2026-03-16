import type { NoteSectionValue } from '../types.js';

export const NOTE_SECTION_ORDER = [
  'hpi',
  'chief-complaint',
  'past-medical-history',
  'assessment',
  'medications',
  'allergies',
  'review-of-systems',
  'physical-exam',
  'procedures',
  'results'
] as const;

export type NoteSectionKey = (typeof NOTE_SECTION_ORDER)[number];

export const NOTE_SECTION_LABELS: Record<NoteSectionKey, string> = {
  hpi: 'History of Present Illness',
  'chief-complaint': 'Chief Complaint',
  'past-medical-history': 'Past Medical History',
  assessment: 'Assessment',
  medications: 'Medications',
  allergies: 'Allergies',
  'review-of-systems': 'Review of Systems',
  'physical-exam': 'Physical Exam',
  procedures: 'Procedures',
  results: 'Results'
};

export const EMPTY_NOTE_PLACEHOLDER = '__NOTE_EMPTY__';

const DEFAULT_NOTE_SECTION_VALUES: Record<NoteSectionKey, NoteSectionValue> = {
  hpi: ['hpi', 'chief-complaint'],
  'chief-complaint': EMPTY_NOTE_PLACEHOLDER,
  'past-medical-history': EMPTY_NOTE_PLACEHOLDER,
  assessment: ['assessment', 'plan'],
  medications: EMPTY_NOTE_PLACEHOLDER,
  allergies: EMPTY_NOTE_PLACEHOLDER,
  'review-of-systems': EMPTY_NOTE_PLACEHOLDER,
  'physical-exam': 'physical-exam',
  procedures: 'procedures',
  results: 'results'
};

const isPlaceholder = (value: unknown): boolean =>
  typeof value === 'string' && value.trim() === EMPTY_NOTE_PLACEHOLDER;

const cleanseValue = (value: NoteSectionValue | undefined): NoteSectionValue => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).length ? [...value] : EMPTY_NOTE_PLACEHOLDER;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return EMPTY_NOTE_PLACEHOLDER;
    }
    return isPlaceholder(trimmed) ? EMPTY_NOTE_PLACEHOLDER : trimmed;
  }
  if (value === null || value === undefined) {
    return EMPTY_NOTE_PLACEHOLDER;
  }
  return value;
};

export const normalizeNoteSections = (
  input?: Record<string, NoteSectionValue>
): Record<NoteSectionKey, NoteSectionValue> => {
  const normalized = {} as Record<NoteSectionKey, NoteSectionValue>;
  NOTE_SECTION_ORDER.forEach(key => {
    const source = input?.[key];
    const cleansed = cleanseValue(source);
    if (cleansed === EMPTY_NOTE_PLACEHOLDER) {
      normalized[key] = DEFAULT_NOTE_SECTION_VALUES[key];
      return;
    }
    normalized[key] = Array.isArray(cleansed)
      ? cleansed.filter(Boolean).length ? [...cleansed] : DEFAULT_NOTE_SECTION_VALUES[key]
      : cleansed;
  });
  return normalized;
};

export const getDefaultNoteSections = (): Record<NoteSectionKey, NoteSectionValue> =>
  normalizeNoteSections(DEFAULT_NOTE_SECTION_VALUES);

