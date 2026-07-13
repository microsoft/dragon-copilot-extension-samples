import yaml from 'js-yaml';
import { EMPTY_NOTE_PLACEHOLDER } from './note-sections.js';

const { dump } = yaml;

const YES_NO_COLON_REGEX = /(:\s*)(['\"])(yes|no)\2/g;
const YES_NO_LIST_REGEX = /(-\s*)(['\"])(yes|no)\2/g;

const NOTE_PLACEHOLDER_QUOTED_REGEX = new RegExp(`: ['"]${EMPTY_NOTE_PLACEHOLDER}['"]`, 'g');
const NOTE_PLACEHOLDER_UNQUOTED_REGEX = new RegExp(`: ${EMPTY_NOTE_PLACEHOLDER}`, 'g');
const NOTE_LIST_PLACEHOLDER_QUOTED_REGEX = new RegExp(`(-\\s*)['"]${EMPTY_NOTE_PLACEHOLDER}['"]`, 'g');
const NOTE_LIST_PLACEHOLDER_UNQUOTED_REGEX = new RegExp(`(-\\s*)${EMPTY_NOTE_PLACEHOLDER}`, 'g');

const sanitizeYamlText = (text: string): string =>
  text
    .replace(YES_NO_COLON_REGEX, '$1$3')
    .replace(YES_NO_LIST_REGEX, '$1$3')
    .replace(NOTE_PLACEHOLDER_QUOTED_REGEX, ': ')
    .replace(NOTE_PLACEHOLDER_UNQUOTED_REGEX, ': ')
    .replace(NOTE_LIST_PLACEHOLDER_QUOTED_REGEX, '$1')
    .replace(NOTE_LIST_PLACEHOLDER_UNQUOTED_REGEX, '$1');

const ENTRA_ID_DOC_URL =
  'https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/partner-apis/entra-id';

const SERVER_AUTH_COMMENT = [
  '# Server authentication validates the partner service calling the Dragon DDE/Partner API.',
  '# Configure issuers and identity claims using Microsoft Entra ID. For details, see:',
  `# ${ENTRA_ID_DOC_URL}`
].join('\n');

const SERVER_AUTH_LINE_REGEX = /^server-authentication:/m;
const SERVER_AUTH_DOC_COMMENT_LINE_REGEX = new RegExp(
  `^[ \\t]*# ${ENTRA_ID_DOC_URL.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[ \\t]*$`,
  'm'
);

const annotateServerAuth = (text: string): string => {
  if (SERVER_AUTH_DOC_COMMENT_LINE_REGEX.test(text)) {
    return text;
  }
  return text.replace(SERVER_AUTH_LINE_REGEX, `${SERVER_AUTH_COMMENT}\nserver-authentication:`);
};

const CLIENT_AUTH_ENTRA_DOC_URL =
  'https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/get-started/access-token-requirements-entra';

const CLIENT_AUTH_OWN_PROVIDER_DOC_URL =
  'https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/sdk/get-started/access-token-requirements-own-provider';

const CLIENT_AUTH_COMMENT_LINES = [
  'Customer (client) authentication validates the access tokens issued for the clinical application.',
  'Access token requirements when using Microsoft Entra ID:',
  CLIENT_AUTH_ENTRA_DOC_URL,
  'Access token requirements when using your own identity provider:',
  CLIENT_AUTH_OWN_PROVIDER_DOC_URL
];

const CLIENT_AUTH_LINE_REGEX = /^([ \t]*)client-authentication:/m;

const annotateClientAuth = (text: string): string => {
  if (text.includes(CLIENT_AUTH_ENTRA_DOC_URL)) {
    return text;
  }
  return text.replace(CLIENT_AUTH_LINE_REGEX, (_match, indent: string) => {
    const comment = CLIENT_AUTH_COMMENT_LINES.map(line => `${indent}# ${line}`).join('\n');
    return `${comment}\n${indent}client-authentication:`;
  });
};

export const dumpManifestYaml = (value: unknown): string => {
  const contents = dump(value, { lineWidth: -1 });
  return annotateClientAuth(annotateServerAuth(sanitizeYamlText(contents)));
};

