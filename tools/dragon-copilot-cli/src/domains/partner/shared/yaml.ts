import yaml from 'js-yaml';
import { EMPTY_NOTE_PLACEHOLDER } from './note-sections.js';

const { dump } = yaml;

const YES_NO_COLON_REGEX = /(:\s*)(['\"])(yes|no)\2/g;
const YES_NO_LIST_REGEX = /(-\s*)(['\"])(yes|no)\2/g;

const NOTE_PLACEHOLDER_QUOTED_REGEX = new RegExp(`: ['"]${EMPTY_NOTE_PLACEHOLDER}['"]`, 'g');
const NOTE_PLACEHOLDER_UNQUOTED_REGEX = new RegExp(`: ${EMPTY_NOTE_PLACEHOLDER}`, 'g');
const NOTE_LIST_PLACEHOLDER_QUOTED_REGEX = new RegExp(`(-\s*)['"]${EMPTY_NOTE_PLACEHOLDER}['"]`, 'g');
const NOTE_LIST_PLACEHOLDER_UNQUOTED_REGEX = new RegExp(`(-\s*)${EMPTY_NOTE_PLACEHOLDER}`, 'g');

const sanitizeYamlText = (text: string): string =>
  text
    .replace(YES_NO_COLON_REGEX, '$1$3')
    .replace(YES_NO_LIST_REGEX, '$1$3')
    .replace(NOTE_PLACEHOLDER_QUOTED_REGEX, ': ')
    .replace(NOTE_PLACEHOLDER_UNQUOTED_REGEX, ': ')
    .replace(NOTE_LIST_PLACEHOLDER_QUOTED_REGEX, '$1')
    .replace(NOTE_LIST_PLACEHOLDER_UNQUOTED_REGEX, '$1');

export const dumpManifestYaml = (value: unknown): string => {
  const contents = dump(value, { lineWidth: -1 });
  return sanitizeYamlText(contents);
};
