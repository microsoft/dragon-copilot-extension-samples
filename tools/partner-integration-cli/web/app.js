'use strict';

const YAML_LIB = typeof window !== 'undefined' && window.jsyaml ? window.jsyaml : null;
const JSZIP_LIB = typeof window !== 'undefined' && window.JSZip ? window.JSZip : null;

const SAMPLE_LOGO_BASE64 =
  'ACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAGOvj4+nnqWM8fnv7GgwjACW+nD7/uvymbzQON2G2fa8/v36ZOAZbEYAS206Kq+PX4+nDm+MX6L3Sd4zvDxPHYxMCUKIwAC9GzcT5dvp+eeCNR837yCQAJfYJwJ/x+/T54+X5bOPD19+XBxsyBGAcASixZwD+jo33Cj49Xh5g3BCAcQSgxAECcB6b7A/UvxcBGEcAStRPmtmxMgKVV/6nIQDjCECJAwXgPBbeDlTd818OARhHAEq0B6Dpy/7w4/Lfukf38/W1x2xYecwFpukzYREBKLFxAF6YmzS3x4/Tp4nXm7b0Ud/yJxAv31fvZ0I7ASgxLgC9r/9qNN4KLIlM9wpjxvnYyz4TWghAifYJuubL3r9B17AKWPALvzXvgVoCUKImAD3HeRq3rtS9V/915081ASjRPjHXT6DO+/Wrm3N9r3UrJhyPAJSoDEDvVfvKbUDPzv/VkHBUAlCiNgC9V+65Y/bsKcy9BscmACWqA9C3Cpheuref89VVBIcmACXaJ9NWAehavk89DuzZ/Z/6f+6CAJTYIQA9twFTE7gjINudM9UEoMQeAWg/5tQGXvstxPJf+7E/ASjRPhnvLwDu/++ZAJRon4xHCUD7EwABuGcCUKJ9MgoAlQSgRPtkFAAqCUCJ9skoAFQSgBLtk3G7AKx7DNgeAE8B7pkAlNghAB0/5Jn6JWD7U4ANz5lyAlCiPgBrJ3DP/08FhPsgACWqA9B+vNklfMcvAaf2ELgPAlCifUJuEoCO5f/s5O15jbmIcHgCUKI2AO0beNeW7+3n/N+Y2Ejk+ASgRPtkWh2AnqX7jSt3T0jOY/W5U04ASlQFoOPR33nMLf+fdMXkPPwm4N4IQImKAHRO/qZjtZ/38xCBeyIAJdon0u1JOaFrw+7vaLxn73kc+Dyu31r0ON+GLPpMaCIAJUYFoP11X4+eCdq/svh/NEZmysv9h77PhB4CUKJ9orZ82ZddlZ9HyzFe6d4LeDtuH3P+M7r9vywlACXmv9zVY/6x33W9TwS2HAIwjgCUOEgAVizJV90KrBwCMI4AlNg/AEuv/K8s2WzcYAjAOAJQYt8AbDqBdojApufPKwJQYqcA3Pqhz2K1twMCMI4AlKgOQM2Pcao2BgVgHAEoURSAVZt8S41/bwIwjgCUGDRJhi3xl9l2RVCzikknAIzRvVlowu9BACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAg2L9z0nt1z4GMZAAAAABJRU5ErkJggg==';
const SAMPLE_LOGO_FILENAME = 'logo_large.png';

const isPlainObject = value => Object.prototype.toString.call(value) === '[object Object]';

const formatScalar = value => {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value ?? '');
};

const basicYaml = (value, level = 0) => {
  const indent = '  '.repeat(level);
  if (Array.isArray(value)) {
    if (!value.length) {
      return indent + '[]';
    }
    return value
      .map(item => {
        if (Array.isArray(item) || isPlainObject(item)) {
          const nested = basicYaml(item, level + 1);
          return `${indent}-\n${nested}`;
        }
        return `${indent}- ${formatScalar(item)}`;
      })
      .join('\n');
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, val]) => val !== undefined);
    if (!entries.length) {
      return indent + '{}';
    }
    return entries
      .map(([key, val]) => {
        if (Array.isArray(val) || isPlainObject(val)) {
          const nested = basicYaml(val, level + 1);
          return `${indent}${key}:\n${nested}`;
        }
        return `${indent}${key}: ${formatScalar(val)}`;
      })
      .join('\n');
  }
  return indent + formatScalar(value);
};

const dumpYaml = (value, options = {}) => {
  if (YAML_LIB) {
    return YAML_LIB.dump(value, options);
  }
  console.warn('js-yaml unavailable; using basic YAML serializer.');
  return basicYaml(value);
};

const NOTE_SECTION_ORDER = Object.freeze([
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
]);

const EMPTY_NOTE_PLACEHOLDER = '__NOTE_EMPTY__';

const createEmptyNoteSections = () =>
  NOTE_SECTION_ORDER.reduce((map, key) => {
    map[key] = EMPTY_NOTE_PLACEHOLDER;
    return map;
  }, {});

const orderNoteSections = source =>
  NOTE_SECTION_ORDER.reduce((map, key) => {
    const raw = source ? source[key] : undefined;
    if (Array.isArray(raw)) {
      map[key] = raw.slice();
      return map;
    }
    if (raw === EMPTY_NOTE_PLACEHOLDER) {
      map[key] = EMPTY_NOTE_PLACEHOLDER;
      return map;
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      map[key] = trimmed ? trimmed : EMPTY_NOTE_PLACEHOLDER;
      return map;
    }
    if (raw !== undefined && raw !== null) {
      map[key] = raw;
      return map;
    }
    map[key] = EMPTY_NOTE_PLACEHOLDER;
    return map;
  }, {});

const DEFAULT_NOTE_SECTIONS = Object.freeze(
  orderNoteSections({
    ...createEmptyNoteSections(),
    hpi: ['hpi', 'chief-complaint'],
    assessment: ['assessment', 'plan'],
    'physical-exam': 'physical-exam',
    procedures: 'procedures',
    results: 'results'
  })
);

const OPTIONAL_NOTE_SECTIONS = Object.freeze(orderNoteSections(createEmptyNoteSections()));

const DEFAULT_ISSUER_NAME = 'access-token-issuer';
const DEFAULT_SOF_DESCRIPTION = 'The value of the issuer claim when invoking the Dragon Copilot SMART on FHIR endpoint.';
const DEFAULT_TOKEN_ISSUER_DESCRIPTION = 'The value of the issuer claim for partner issued, user scoped access tokens.';
const DEFAULT_USER_IDENTITY_DESCRIPTION = 'Optional claim containing the EHR identity of an end user. Defaults to "sub".';
const DEFAULT_CUSTOMER_IDENTITY_DESCRIPTION = 'Optional claim containing the Microsoft environment identifier.';
const DEFAULT_DESCRIPTION_FALLBACK = 'PARTNER INTEGRATION';
const INTEGRATION_DESCRIPTION_SUFFIX = ' for Dragon Copilot healthcare data processing.';
const YES_NO_COLON_REGEX = /(:\s*)(['"])(yes|no)\2/g;
const YES_NO_LIST_REGEX = /(-\s*)(['"])(yes|no)\2/g;
const toPlainYesNo = text => text.replace(YES_NO_COLON_REGEX, '$1$3').replace(YES_NO_LIST_REGEX, '$1$3');
const NOTE_PLACEHOLDER_QUOTED_REGEX = new RegExp(`: ['"]${EMPTY_NOTE_PLACEHOLDER}['"]`, 'g');
const NOTE_PLACEHOLDER_UNQUOTED_REGEX = new RegExp(`: ${EMPTY_NOTE_PLACEHOLDER}`, 'g');
const NOTE_LIST_PLACEHOLDER_QUOTED_REGEX = new RegExp(`(-\s*)['"]${EMPTY_NOTE_PLACEHOLDER}['"]`, 'g');
const NOTE_LIST_PLACEHOLDER_UNQUOTED_REGEX = new RegExp(`(-\s*)${EMPTY_NOTE_PLACEHOLDER}`, 'g');
const PARTNER_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const sanitizeNotePlaceholders = text =>
  text
    .replace(NOTE_PLACEHOLDER_QUOTED_REGEX, ': ')
    .replace(NOTE_PLACEHOLDER_UNQUOTED_REGEX, ': ')
    .replace(NOTE_LIST_PLACEHOLDER_QUOTED_REGEX, '$1')
    .replace(NOTE_LIST_PLACEHOLDER_UNQUOTED_REGEX, '$1');

const generateGuid = () => {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().toLowerCase();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
    }
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const sanitizeIntegrationNameForDescription = rawName => {
  if (!rawName || !rawName.trim()) {
    return DEFAULT_DESCRIPTION_FALLBACK;
  }

  const spaced = rawName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced ? spaced.toUpperCase() : DEFAULT_DESCRIPTION_FALLBACK;
};

const ensureIntegrationSuffix = upperName =>
  upperName.endsWith(' INTEGRATION') ? upperName : `${upperName} INTEGRATION`;

const buildManifestDescription = rawName => {
  const upperName = sanitizeIntegrationNameForDescription(rawName);
  return `${ensureIntegrationSuffix(upperName)}${INTEGRATION_DESCRIPTION_SUFFIX}`;
};

const CONTEXT_ITEMS = Object.freeze({
  'base_url': {
    type: 'url',
    description: 'base url need for API calls.  These are typically FHIR calls.',
    required: 'yes'
  },
  'ehr-user_id': {
    type: 'string',
    description: 'optional EHR user id for FHIR API calls.',
    required: 'no'
  },
  'in-bound-client-id': {
    type: 'string',
    description: 'credential for inbound calls to interop',
    required: 'yes'
  },
  'in-bound-issuer': {
    type: 'url',
    description: 'issue claim of access tokens used to partner to call Dragon Copilot Interop',
    required: 'yes'
  },
  'out-bound-issuer': {
    type: 'url',
    description: 'endpoint used to issue access token for Dragon Copilot Interop to call partner',
    required: 'yes'
  },
  'out-bound-client-id': {
    type: 'string',
    description: 'partner provided client id to issued access tokens for Dragon Copilot Interop to call partner',
    required: 'yes'
  },
  'out-bound-secret': {
    type: 'string',
    description: 'partner provided secret to issued access tokens for Dragon Copilot Interop to call partner',
    required: 'yes'
  }
});

const NOTE_KEYS = [
  'hpi',
  'chief-complaint',
  'past-medical-history',
  'assessment',
  'plan',
  'medications',
  'allergies',
  'review-of-systems',
  'physical-exam',
  'procedures',
  'results'
];

const isValidUrl = value => {
  if (!value) {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isValidIdentityClaim = value => /^[A-Za-z]{3}$/.test(value || '');

document.addEventListener('DOMContentLoaded', () => {
  const serverAuthList = document.querySelector('#server-auth-list');
  const addServerAuthBtn = document.querySelector('#add-server-auth');
  const noteStrategySelect = document.querySelector('#note-strategy');
  const manualNoteContainer = document.querySelector('#manual-note-config');
  const userToggle = document.querySelector('#client-include-user');
  const userFields = document.querySelector('#client-user-fields');
  const customerToggle = document.querySelector('#client-include-customer');
  const customerFields = document.querySelector('#client-customer-fields');
  const webLaunchMode = document.querySelector('#web-launch-mode');
  const webSofFields = document.querySelector('#web-sof-fields');
  const webTokenFields = document.querySelector('#web-token-fields');
  const webTokenReuse = document.querySelector('#web-token-reuse');
  const webTokenIssuerList = document.querySelector('#web-token-issuer-list');
  const addWebTokenIssuerBtn = document.querySelector('#add-web-token-issuer');
  const webTokenMultiContainer = document.querySelector('#web-token-multi-container');
  const contextList = document.querySelector('#context-item-list');
  const addContextItemBtn = document.querySelector('#add-context-item');
  const includePublisherToggle = document.querySelector('#include-publisher');
  const publisherFields = document.querySelector('#publisher-fields');
  const generateBtn = document.querySelector('#generate');
  const resetBtn = document.querySelector('#reset');
  const manifestOutput = document.querySelector('#manifest-output');
  const publisherOutput = document.querySelector('#publisher-output');
  const errorContainer = document.querySelector('#form-errors');
  const uploadNote = document.querySelector('#upload-note');
  const outputContent = document.querySelector('#output-content');
  const downloadAssetsBtn = document.querySelector('#download-assets');
  const partnerIdInput = document.querySelector('#partner-id');
  const partnerIdGenerateBtn = document.querySelector('#generate-partner-id');

  const downloadButtons = document.querySelectorAll('button[data-download]');

  const manualNoteState = {
    availableKeys: [],
    structure: []
  };

  let currentDragData = null;

  const sortAvailableKeys = () => {
    manualNoteState.availableKeys.sort((a, b) => NOTE_KEYS.indexOf(a) - NOTE_KEYS.indexOf(b));
  };

  const resetManualNoteState = () => {
    manualNoteState.availableKeys = NOTE_KEYS.slice();
    manualNoteState.structure = [];
    sortAvailableKeys();
  };

  const removeKeyFromAvailable = key => {
    manualNoteState.availableKeys = manualNoteState.availableKeys.filter(item => item !== key);
  };

  const addKeysToAvailable = keys => {
    manualNoteState.availableKeys = manualNoteState.availableKeys
      .concat(keys)
      .filter((value, index, array) => array.indexOf(value) === index);
    sortAvailableKeys();
  };

  const findMainNode = key => manualNoteState.structure.find(node => node.key === key);

  const keyInStructure = key =>
    manualNoteState.structure.some(node => node.key === key || node.children.includes(key));

  const addMainSection = key => {
    if (keyInStructure(key) || !manualNoteState.availableKeys.includes(key)) {
      return;
    }
    removeKeyFromAvailable(key);
    manualNoteState.structure.push({ key, children: [] });
    renderManualNoteConfig();
  };

  const addSubSection = (parentKey, childKey) => {
    if (keyInStructure(childKey) || !manualNoteState.availableKeys.includes(childKey)) {
      return;
    }
    const parent = findMainNode(parentKey);
    if (!parent) {
      return;
    }
    removeKeyFromAvailable(childKey);
    parent.children.push(childKey);
    renderManualNoteConfig();
  };

  const removeMainSection = key => {
    const index = manualNoteState.structure.findIndex(node => node.key === key);
    if (index === -1) {
      return;
    }
    const [removed] = manualNoteState.structure.splice(index, 1);
    addKeysToAvailable([removed.key, ...removed.children]);
    renderManualNoteConfig();
  };

  const removeChildSection = (parentKey, childKey) => {
    const parent = findMainNode(parentKey);
    if (!parent) {
      return;
    }
    parent.children = parent.children.filter(key => key !== childKey);
    addKeysToAvailable([childKey]);
    renderManualNoteConfig();
  };

  const createNoteChip = key => {
    const chip = document.createElement('div');
    chip.className = 'note-chip';
    chip.draggable = true;
    chip.dataset.source = 'available';
    chip.dataset.key = key;
    chip.textContent = key;
    chip.addEventListener('dragstart', event => {
      currentDragData = { source: 'available', key };
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', key);
      chip.classList.add('dragging');
    });
    chip.addEventListener('dragend', () => {
      currentDragData = null;
      chip.classList.remove('dragging');
    });
    return chip;
  };

  const allowDrop = event => {
    if (!currentDragData || currentDragData.source !== 'available') {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleHierarchyDrop = event => {
    if (!currentDragData || currentDragData.source !== 'available') {
      return;
    }
    const target = event.currentTarget;
    if (!target || target.dataset.role !== 'main-drop') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    addMainSection(currentDragData.key);
  };

  const handleChildDrop = event => {
    if (!currentDragData || currentDragData.source !== 'available') {
      return;
    }
    const parentKey = event.currentTarget.dataset.parent;
    if (!parentKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    addSubSection(parentKey, currentDragData.key);
  };

  const createChildNode = (parentKey, childKey) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'note-child';
    const label = document.createElement('span');
    label.textContent = childKey;
    wrapper.appendChild(label);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'note-chip-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove ${childKey}`);
    removeBtn.addEventListener('click', () => removeChildSection(parentKey, childKey));
    wrapper.appendChild(removeBtn);
    return wrapper;
  };

  const createMainNode = node => {
    const container = document.createElement('div');
    container.className = 'note-node';
    container.dataset.key = node.key;

    const header = document.createElement('div');
    header.className = 'note-node-header';
    header.dataset.parent = node.key;
    header.addEventListener('dragover', allowDrop);
    header.addEventListener('drop', handleChildDrop);
    const label = document.createElement('span');
    label.textContent = node.key;
    header.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'note-node-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove ${node.key}`);
    removeBtn.addEventListener('click', () => removeMainSection(node.key));
    header.appendChild(removeBtn);

    container.appendChild(header);

    const childList = document.createElement('div');
    childList.className = 'note-children';
    childList.dataset.parent = node.key;
    childList.addEventListener('dragover', allowDrop);
    childList.addEventListener('drop', handleChildDrop);

    if (!node.children.length) {
      const empty = document.createElement('div');
      empty.className = 'note-child-empty';
      empty.textContent = 'Drop subsections here';
      childList.appendChild(empty);
    } else {
      node.children.forEach(childKey => {
        childList.appendChild(createChildNode(node.key, childKey));
      });
    }

    container.appendChild(childList);
    return container;
  };

  const createHierarchyDropZone = ({ showText = false, text = '' } = {}) => {
    const zone = document.createElement('div');
    zone.className = 'note-dropzone';
    zone.dataset.role = 'main-drop';
    if (showText) {
      zone.textContent = text;
    } else {
      zone.classList.add('note-dropzone-compact');
    }
    zone.addEventListener('dragover', allowDrop);
    zone.addEventListener('drop', handleHierarchyDrop);
    return zone;
  };

  if (downloadAssetsBtn) {
    if (!JSZIP_LIB) {
      downloadAssetsBtn.disabled = true;
      downloadAssetsBtn.title = 'Sample assets download is unavailable because JSZip failed to load.';
    } else {
      downloadAssetsBtn.addEventListener('click', () => {
        downloadSampleAssets().catch(error => {
          console.error('Failed to download sample assets', error);
          window.alert('Unable to create the sample assets archive. Please try again.');
        });
      });
    }
  }

  const state = {
    serverAuthIndex: 0,
    webTokenIssuerIndex: 0
  };

  const SAMPLE_SERVER_AUTH = {
    issuer: 'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0',
    identityClaim: 'azp',
    identityValues: ['00000000-0000-0000-0000-000000000000']
  };

  const resizeTextarea = element => {
    if (!element) {
      return;
    }
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  const clearErrors = () => {
    if (!errorContainer) {
      return;
    }
    errorContainer.hidden = true;
    errorContainer.innerHTML = '';
  };

  const renderErrors = errors => {
    if (!errorContainer) {
      return;
    }
    if (!errors.length) {
      clearErrors();
      return;
    }

    errorContainer.innerHTML = '';
    const heading = document.createElement('h3');
    heading.textContent = 'Please resolve the following before generating:';
    const list = document.createElement('ul');
    errors.forEach(message => {
      const li = document.createElement('li');
      li.textContent = message;
      list.appendChild(li);
    });

    errorContainer.appendChild(heading);
    errorContainer.appendChild(list);
    errorContainer.hidden = false;
    if (typeof errorContainer.focus === 'function') {
      errorContainer.focus();
    }
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getTrimmedValue = selector => {
    const element = document.querySelector(selector);
    return element ? element.value.trim() : '';
  };

  const validateRequiredFields = () => {
    const errors = [];

    const partnerIdValue = partnerIdInput ? partnerIdInput.value.trim() : '';
    if (!partnerIdValue) {
      errors.push('Enter a Partner ID or use the Generate GUID button.');
    } else if (!PARTNER_ID_PATTERN.test(partnerIdValue)) {
      errors.push('Partner ID must be lowercase and can include alphanumeric characters, hyphens, dots, or underscores.');
    }

    const serverItems = Array.from(serverAuthList.querySelectorAll('.item'));
    let validServerCount = 0;
    serverItems.forEach((item, index) => {
      const issuer = item.querySelector('[data-field="issuer"]')?.value.trim() ?? '';
      const claim = item.querySelector('[data-field="identity-claim"]')?.value.trim() ?? '';
      const identityInput = item.querySelector('[data-field="identity-values"]');
      const valuesRaw = identityInput
        ? identityInput.value
            .split(/\n|,/)
            .map(value => value.trim())
            .filter(Boolean)
        : [];

      const missingParts = [];
      let entryValid = true;
      if (!issuer) {
        missingParts.push('issuer URL');
      } else if (!isValidUrl(issuer)) {
        errors.push(`Server authentication entry ${index + 1} issuer must be a valid URL.`);
        entryValid = false;
      }
      if (!claim) {
        missingParts.push('identity claim');
      } else if (!isValidIdentityClaim(claim)) {
        errors.push(`Server authentication entry ${index + 1} identity claim must be exactly 3 letters.`);
        entryValid = false;
      }
      if (!valuesRaw.length) {
        missingParts.push('identity values');
      }

      if (missingParts.length) {
        errors.push(`Server authentication entry ${index + 1} is missing ${missingParts.join(', ')}.`);
      }

      if (!missingParts.length && entryValid) {
        validServerCount++;
      }
    });

    if (validServerCount === 0) {
      errors.push('Add at least one server authentication issuer with identity claim and values.');
    }

    const clientAccessDefault = getTrimmedValue('#client-access-issuer');
    if (clientAccessDefault && !isValidUrl(clientAccessDefault)) {
      errors.push('Client authentication default issuer must be a valid URL.');
    }

    const mode = webLaunchMode.value;

    if (mode !== 'token') {
      const sofDefault = getTrimmedValue('#web-sof-default');
      if (sofDefault && !isValidUrl(sofDefault)) {
        errors.push('SMART on FHIR default issuer must be a valid URL.');
      }
    }

    if (mode !== 'sof' && webTokenReuse.value === 'no') {
      const tokenItems = webTokenIssuerList
        ? Array.from(webTokenIssuerList.querySelectorAll('.item'))
        : [];

      if (!tokenItems.length) {
        errors.push('Add at least one token launch issuer.');
      }

      tokenItems.forEach((item, index) => {
        const userToggle = item.querySelector('[data-field="user-toggle"]');
        const accessDefault = item.querySelector('[data-field="access-default"]')?.value.trim() ?? '';
        if (accessDefault && !isValidUrl(accessDefault)) {
          errors.push(`Token launch issuer ${index + 1} default must be a valid URL.`);
        }
        if (userToggle?.checked) {
          const userRequired = item.querySelector('[data-field="user-required"]');
          if (!userRequired) {
            errors.push(`Token launch issuer ${index + 1} is missing the user identity required selection.`);
          }
        }
      });
    }

    if (mode !== 'token') {
      const sofDefault = getTrimmedValue('#web-sof-default');
      if (sofDefault && !isValidUrl(sofDefault)) {
        errors.push('SMART on FHIR issuer default must be a valid URL.');
      }
    }

    if (includePublisherToggle.checked) {
      [
        { selector: '#publisher-id', label: 'Publisher ID' },
        { selector: '#publisher-name', label: 'Publisher Name' },
        { selector: '#publisher-website', label: 'Website URL' },
        { selector: '#publisher-privacy', label: 'Privacy Policy URL' },
        { selector: '#publisher-support', label: 'Support URL' },
        { selector: '#publisher-email', label: 'Contact Email' },
        { selector: '#publisher-offer', label: 'Offer ID' }
      ].forEach(field => {
        if (!getTrimmedValue(field.selector)) {
          errors.push(`${field.label} is required when generating publisher.json.`);
        } else if (field.label.includes('URL')) {
          const value = getTrimmedValue(field.selector);
          if (value && !isValidUrl(value)) {
            errors.push(`${field.label} must be a valid URL.`);
          }
        }
      });
    }

    return errors;
  };

  const updateUploadNote = (name, version) => {
    if (!uploadNote) {
      return;
    }
    const safeName = name || 'partner-integration';
    const safeVersion = version || '0.0.1';
    const packageName = `${safeName}-${safeVersion}.zip`;
    uploadNote.textContent = `Upload ${packageName} reported by the validation helper script.`;
  };

  const downloadSampleAssets = async () => {
    if (!JSZIP_LIB) {
      throw new Error('JSZip is not available.');
    }

    const zip = new JSZIP_LIB();
    const assetsFolder = zip.folder('assets');
    if (!assetsFolder) {
      throw new Error('Unable to create assets folder within archive.');
    }

    const logoBytes = Uint8Array.from(atob(SAMPLE_LOGO_BASE64), char => char.charCodeAt(0));
    assetsFolder.file(SAMPLE_LOGO_FILENAME, logoBytes, { binary: true });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'assets.zip';
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const createServerAuthItem = (defaults = {}) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'item';
    wrapper.dataset.index = String(state.serverAuthIndex++);

    const header = document.createElement('div');
    header.className = 'item-header';
    header.innerHTML = '<h4>Issuer</h4>';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'secondary';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      wrapper.remove();
      if (!serverAuthList.children.length) {
        createServerAuthItem();
      }
    });
    header.appendChild(removeBtn);
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'field-grid';

    grid.appendChild(
      buildLabeledInput(
        'Issuer URL',
        'text',
        'https://login.microsoftonline.com/[TENANT_ID]/v2.0',
        'issuer',
        defaults.issuer || '',
        true
      )
    );
    grid.appendChild(
      buildLabeledInput('Identity Claim', 'text', 'azp', 'identity-claim', defaults.identityClaim || '', true)
    );

  const identityWrapper = document.createElement('label');
  identityWrapper.className = 'identity-values-field';
    const identityHeading = document.createElement('span');
    identityHeading.className = 'field-label-text';
    identityHeading.textContent = 'Identity Values (one per line)';
    const identityRequired = document.createElement('span');
    identityRequired.className = 'required';
    identityRequired.textContent = '*';
    identityHeading.appendChild(identityRequired);
    identityWrapper.appendChild(identityHeading);

    const identityArea = document.createElement('textarea');
    identityArea.rows = 4;
    identityArea.placeholder = '00000000-0000-0000-0000-000000000000';
    identityArea.dataset.field = 'identity-values';
    const identityDefaults = defaults.identityValues
      ? Array.isArray(defaults.identityValues)
        ? defaults.identityValues.join('\n')
        : String(defaults.identityValues)
      : '';
    if (identityDefaults) {
      identityArea.value = identityDefaults;
    }

    identityWrapper.appendChild(identityArea);
    grid.appendChild(identityWrapper);

    wrapper.appendChild(grid);
    serverAuthList.appendChild(wrapper);
  };

  const buildLabeledInput = (labelText, type, placeholder, field, defaultValue = '', required = false) => {
    const label = document.createElement('label');
    if (field === 'issuer') {
      label.classList.add('issuer-field');
    } else if (field === 'identity-claim') {
      label.classList.add('identity-claim-field');
    }
    const heading = document.createElement('span');
    heading.className = 'field-label-text';
    heading.textContent = labelText;
    if (required) {
      const marker = document.createElement('span');
      marker.className = 'required';
      marker.textContent = '*';
      heading.appendChild(marker);
    }
    if (field === 'identity-claim') {
      const infoWrapper = document.createElement('span');
      infoWrapper.className = 'info-wrapper info-inline';

      const infoButton = document.createElement('button');
      infoButton.type = 'button';
      infoButton.className = 'info-badge info-inline';
      infoButton.setAttribute(
        'aria-label',
        'Identity claim guidance. Common Entra ID claims include Enterprise Application Object ID (oid) or Application (Client) ID (azp) values.'
      );

      const infoSymbol = document.createElement('span');
      infoSymbol.className = 'info-symbol';
      infoSymbol.setAttribute('aria-hidden', 'true');
      infoSymbol.textContent = 'i';
      infoButton.appendChild(infoSymbol);

      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip-content';
      tooltip.setAttribute('role', 'tooltip');

      const tooltipTitle = document.createElement('strong');
      tooltipTitle.textContent = 'Identity claim examples';
      tooltip.appendChild(tooltipTitle);

  const tooltipIntro = document.createElement('span');
  tooltipIntro.textContent = 'Common Entra ID claims include:';
      tooltip.appendChild(tooltipIntro);

      const tooltipOid = document.createElement('span');
  tooltipOid.textContent = '- Enterprise Application Object ID (oid)';
      tooltip.appendChild(tooltipOid);

      const tooltipAzp = document.createElement('span');
  tooltipAzp.textContent = '- Application (Client) ID (azp)';
      tooltip.appendChild(tooltipAzp);

      const tooltipLink = document.createElement('a');
      tooltipLink.href = 'https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/assign-roles-azure-service-principals#find-your-service-principal-and-tenant-ids';
      tooltipLink.target = '_blank';
      tooltipLink.rel = 'noopener noreferrer';
      tooltipLink.textContent = 'Find your service principal and tenant IDs';
      tooltip.appendChild(tooltipLink);

      infoWrapper.appendChild(infoButton);
      infoWrapper.appendChild(tooltip);
      heading.appendChild(infoWrapper);
    }
    label.appendChild(heading);
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.dataset.field = field;
    if (defaultValue) {
      input.value = defaultValue;
    }
    label.appendChild(input);
    return label;
  };

  const renderManualNoteConfig = () => {
    manualNoteContainer.innerHTML = '';
    manualNoteContainer.classList.toggle('manual-note-active', noteStrategySelect.value === 'manual');
    if (noteStrategySelect.value !== 'manual') {
      return;
    }

    if (!manualNoteState.availableKeys.length && !manualNoteState.structure.length) {
      resetManualNoteState();
    }

    const builder = document.createElement('div');
    builder.className = 'manual-note-builder';

    const pool = document.createElement('section');
    pool.className = 'note-pool';
    const poolTitle = document.createElement('h4');
    poolTitle.textContent = 'Available Sections';
    pool.appendChild(poolTitle);

    const poolHint = document.createElement('p');
    poolHint.className = 'note-hint';
    poolHint.textContent = 'Drag sections into the hierarchy to define ordering and optional subsections.';
    pool.appendChild(poolHint);

    const poolList = document.createElement('div');
    poolList.className = 'note-pool-list';
    if (!manualNoteState.availableKeys.length) {
      const empty = document.createElement('div');
      empty.className = 'note-empty';
      empty.textContent = 'All sections are in use.';
      poolList.appendChild(empty);
    } else {
      manualNoteState.availableKeys.forEach(key => {
        poolList.appendChild(createNoteChip(key));
      });
    }
    pool.appendChild(poolList);

    const hierarchy = document.createElement('section');
    hierarchy.className = 'note-hierarchy';
    const hierarchyTitle = document.createElement('h4');
    hierarchyTitle.textContent = 'Section Hierarchy';
    hierarchy.appendChild(hierarchyTitle);

  const hierarchyHint = document.createElement('p');
  hierarchyHint.className = 'note-hint';
  hierarchyHint.textContent = 'Drop desired sections here to generate. Drop additional sections into a generated section to map subsections.';
    hierarchy.appendChild(hierarchyHint);

    const hierarchyList = document.createElement('div');
    hierarchyList.className = 'note-hierarchy-list';
    hierarchyList.addEventListener('dragover', allowDrop);

      if (!manualNoteState.structure.length) {
        const zone = createHierarchyDropZone({
          showText: true,
          text: 'Drop desired sections here to generate.'
        });
        zone.classList.add('note-dropzone-inline');
        hierarchyList.appendChild(zone);

        const empty = document.createElement('div');
        empty.className = 'note-hierarchy-empty';
        empty.textContent = 'Drag sections here to create your hierarchy.';
        hierarchyList.appendChild(empty);
      } else {
        // no leading zone to avoid dashed separators
        manualNoteState.structure.forEach(node => {
          hierarchyList.appendChild(createMainNode(node));
        });

        const trailingZone = createHierarchyDropZone({
          showText: true,
          text: 'Drop here to generate another section'
        });
        trailingZone.classList.add('note-dropzone-inline');
        hierarchyList.appendChild(trailingZone);
      }

    hierarchy.appendChild(hierarchyList);

    builder.appendChild(pool);
    builder.appendChild(hierarchy);
    manualNoteContainer.appendChild(builder);
  };

  const getContextRows = () => Array.from(contextList.querySelectorAll('.context-item-row'));

  const computeAvailableContextKeys = excludeRow => {
    const selected = new Set();
    getContextRows().forEach(row => {
      if (row === excludeRow) {
        return;
      }
      const select = row.querySelector('.context-select');
      if (select && select.value) {
        selected.add(select.value);
      }
    });
    return Object.keys(CONTEXT_ITEMS).filter(key => !selected.has(key));
  };

  const updateAddContextButtonState = () => {
    if (!addContextItemBtn) {
      return;
    }
    addContextItemBtn.disabled = computeAvailableContextKeys(null).length === 0;
  };

  const applyContextMetadata = (row, key, { reset = false } = {}) => {
    const meta = CONTEXT_ITEMS[key] || null;
    const descriptionInput = row.querySelector('.context-description');
    if (descriptionInput) {
      descriptionInput.value = meta ? meta.description : '';
      descriptionInput.placeholder = meta ? meta.description : '';
    }

    const requiredCheckbox = row.querySelector('.context-required');
    if (requiredCheckbox) {
      const defaultRequired = meta ? meta.required === 'yes' : false;
      if (reset || row.dataset.requiredEdited !== 'true') {
        requiredCheckbox.checked = defaultRequired;
        row.dataset.requiredEdited = reset ? 'false' : row.dataset.requiredEdited || 'false';
      }
    }

    row.dataset.contextKey = key || '';
  };

  const updateContextRowOptions = (row, { preserveValues = true } = {}) => {
    const select = row.querySelector('.context-select');
    if (!select) {
      return;
    }
    const currentKey = select.value;
    const available = computeAvailableContextKeys(row);
    select.innerHTML = '';
    available.forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      select.appendChild(option);
    });

    if (!available.length) {
      applyContextMetadata(row, '', { reset: true });
      return;
    }

    let selectedKey = currentKey;
    if (!preserveValues || !selectedKey || !available.includes(selectedKey)) {
      selectedKey = available[0];
    }

    select.value = selectedKey;
    const shouldReset = !preserveValues || selectedKey !== currentKey;
    applyContextMetadata(row, selectedKey, { reset: shouldReset });
  };

  const updateAllContextRowOptions = () => {
    getContextRows().forEach(row => updateContextRowOptions(row, { preserveValues: true }));
    updateAddContextButtonState();
  };

  const handleContextSelectionChange = row => {
    const select = row.querySelector('.context-select');
    if (!select) {
      return;
    }
    const key = select.value;
    applyContextMetadata(row, key, { reset: true });
    updateAllContextRowOptions();
  };

  const addContextItem = () => {
    const available = computeAvailableContextKeys(null);
    if (!available.length) {
      return;
    }

    const row = document.createElement('div');
    row.className = 'context-item-row field-grid';
    row.dataset.requiredEdited = 'false';

    const includeLabel = document.createElement('label');
    includeLabel.textContent = 'Include';
    const select = document.createElement('select');
    select.className = 'context-select';
    includeLabel.appendChild(select);
    row.appendChild(includeLabel);

  const descriptionLabel = document.createElement('label');
  descriptionLabel.textContent = 'Description (auto)';
  const descriptionInput = document.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.readOnly = true;
  descriptionInput.className = 'context-description';
    descriptionLabel.appendChild(descriptionInput);
    row.appendChild(descriptionLabel);

  const requiredLabel = document.createElement('label');
  requiredLabel.className = 'context-required-wrapper';
  const requiredHeading = document.createElement('span');
  requiredHeading.className = 'context-required-label';
  requiredHeading.textContent = 'Required';
  requiredLabel.appendChild(requiredHeading);
  const requiredCheckbox = document.createElement('input');
  requiredCheckbox.type = 'checkbox';
  requiredCheckbox.className = 'context-required';
  requiredCheckbox.setAttribute('aria-label', 'Required');
  requiredLabel.appendChild(requiredCheckbox);
  row.appendChild(requiredLabel);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'secondary context-remove';
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', 'Remove context item');
  row.appendChild(removeBtn);

    select.addEventListener('change', () => handleContextSelectionChange(row));
    requiredCheckbox.addEventListener('change', () => {
      row.dataset.requiredEdited = 'true';
    });
    removeBtn.addEventListener('click', () => {
      row.remove();
      updateAllContextRowOptions();
    });

    contextList.appendChild(row);
    updateContextRowOptions(row, { preserveValues: false });
    updateAllContextRowOptions();
  };

  const addWebTokenIssuer = () => {
    if (!webTokenIssuerList) {
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'item';
    wrapper.dataset.index = String(state.webTokenIssuerIndex++);

    const header = document.createElement('div');
    header.className = 'item-header';
    header.innerHTML = '<h4>Token Issuer</h4>';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'secondary';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      wrapper.remove();
    });

    header.appendChild(removeBtn);
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'field-grid';

    const accessLabel = document.createElement('label');
    accessLabel.className = 'full';
    const accessHeading = document.createElement('span');
    accessHeading.className = 'field-label-text';
    accessHeading.textContent = 'Access Token Issuer Default (optional)';
    accessLabel.appendChild(accessHeading);
    const accessInput = document.createElement('input');
    accessInput.type = 'text';
    accessInput.placeholder = 'https://login.microsoftonline.com/[TENANT_ID]/v2.0';
    accessInput.dataset.field = 'access-default';
    accessLabel.appendChild(accessInput);
    grid.appendChild(accessLabel);

    wrapper.appendChild(grid);

    const userFieldset = document.createElement('fieldset');
    userFieldset.className = 'toggle token-issuer-user';
    const userLegend = document.createElement('legend');
    userLegend.textContent = 'User Identity Claim';
    userFieldset.appendChild(userLegend);

    const userToggleLabel = document.createElement('label');
    const userToggle = document.createElement('input');
    userToggle.type = 'checkbox';
    userToggle.dataset.field = 'user-toggle';
    userToggleLabel.appendChild(userToggle);
    userToggleLabel.appendChild(document.createTextNode(' Prompt client for user identity claim'));
    userFieldset.appendChild(userToggleLabel);

    const userFields = document.createElement('div');
    userFields.className = 'field-grid nested is-hidden';

    const userDefault = document.createElement('label');
    const userDefaultHeading = document.createElement('span');
    userDefaultHeading.className = 'field-label-text';
    userDefaultHeading.textContent = 'Default Value';
    userDefault.appendChild(userDefaultHeading);
    const userDefaultInput = document.createElement('input');
    userDefaultInput.type = 'text';
    userDefaultInput.value = 'sub';
    userDefaultInput.dataset.field = 'user-default';
    userDefault.appendChild(userDefaultInput);
    userFields.appendChild(userDefault);

    const userRequired = document.createElement('label');
    const userRequiredHeading = document.createElement('span');
    userRequiredHeading.className = 'field-label-text';
    userRequiredHeading.textContent = 'Required?';
    userRequired.appendChild(userRequiredHeading);
    const userRequiredSelect = document.createElement('select');
    userRequiredSelect.dataset.field = 'user-required';
    ['no', 'yes'].forEach(optionValue => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue.charAt(0).toUpperCase() + optionValue.slice(1);
      userRequiredSelect.appendChild(option);
    });
    userRequiredSelect.value = 'no';
    userRequired.appendChild(userRequiredSelect);
    userFields.appendChild(userRequired);

    userFieldset.appendChild(userFields);
    wrapper.appendChild(userFieldset);

    userToggle.addEventListener('change', () => {
      userFields.classList.toggle('is-hidden', !userToggle.checked);
    });

    webTokenIssuerList.appendChild(wrapper);
  };

  const toggleWebLaunchSections = () => {
    const mode = webLaunchMode.value;
    webSofFields.style.display = mode === 'token' ? 'none' : 'grid';
    webTokenFields.style.display = mode === 'sof' ? 'none' : 'block';
    if (mode !== 'token' && webTokenIssuerList && !webTokenIssuerList.children.length) {
      webTokenIssuerList.innerHTML = '';
    }
    if (mode !== 'sof' && webTokenReuse.value === 'no' && webTokenIssuerList && !webTokenIssuerList.children.length) {
      addWebTokenIssuer();
    }
  };

  const handleWebTokenReuseChange = () => {
    const reuse = webTokenReuse.value;
    const usingClientAuth = reuse === 'yes';

    if (addWebTokenIssuerBtn) {
      addWebTokenIssuerBtn.disabled = usingClientAuth;
      addWebTokenIssuerBtn.classList.toggle('is-hidden', usingClientAuth);
    }

    if (webTokenIssuerList) {
      if (usingClientAuth) {
        webTokenIssuerList.innerHTML = '';
        state.webTokenIssuerIndex = 0;
      } else if (!webTokenIssuerList.children.length) {
        addWebTokenIssuer();
      }
      webTokenIssuerList.classList.toggle('is-hidden', usingClientAuth);
    }

    if (webTokenMultiContainer) {
      webTokenMultiContainer.classList.toggle('is-hidden', usingClientAuth);
    }
  };

  const setPublisherVisibility = () => {
    publisherFields.style.display = includePublisherToggle.checked ? 'grid' : 'none';
  };

  const gatherServerAuthentication = () => {
    const entries = [];
    serverAuthList.querySelectorAll('.item').forEach(item => {
      const issuer = item.querySelector('[data-field="issuer"]').value.trim();
      const claim = item.querySelector('[data-field="identity-claim"]').value.trim();
      const valuesRaw = item
        .querySelector('[data-field="identity-values"]')
        .value.split(/\n|,/)
        .map(v => v.trim())
        .filter(Boolean);
      if (issuer && claim && valuesRaw.length) {
        entries.push({
          issuer,
          identity_claim: claim,
          identity_value: valuesRaw
        });
      }
    });
    return entries;
  };

  const gatherNoteSections = () => {
    const strategy = noteStrategySelect.value;
    if (strategy === 'all') {
      return orderNoteSections(DEFAULT_NOTE_SECTIONS);
    }
    if (strategy === 'optional') {
      return orderNoteSections(OPTIONAL_NOTE_SECTIONS);
    }
    if (strategy !== 'manual') {
      return undefined;
    }

    if (!manualNoteState.structure.length) {
      const map = {};
      NOTE_KEYS.forEach(key => {
        map[key] = EMPTY_NOTE_PLACEHOLDER;
      });
      return map;
    }

    const map = {};
    const childKeys = new Set();
    manualNoteState.structure.forEach(node => {
      node.children.forEach(child => childKeys.add(child));
    });

    manualNoteState.structure.forEach(node => {
      if (!node.children.length) {
        map[node.key] = node.key;
      } else {
        map[node.key] = [node.key, ...node.children];
      }
    });

    NOTE_KEYS.forEach(key => {
      if (map[key]) {
        return;
      }
      map[key] = EMPTY_NOTE_PLACEHOLDER;
    });

    return Object.keys(map).length ? orderNoteSections(map) : undefined;
  };

  const buildClientAuthentication = () => {
    const allowMultiple = document.querySelector('#client-allow-multiple').value;
    const accessDefault = document.querySelector('#client-access-issuer').value.trim();

    const issuer = {
      'access-token-issuer': {
        type: 'url',
        description: 'The value of the issuer claim for partner issues, user scoped access tokens.',
        required: 'yes'
      }
    };
    if (accessDefault) {
      issuer['access-token-issuer']['default-value'] = accessDefault;
    }

    if (userToggle.checked) {
      issuer['user-identity-claim'] = {
        type: 'string',
        description: DEFAULT_USER_IDENTITY_DESCRIPTION,
        required: document.querySelector('#client-user-required').value
      };
      const defaultValue = document.querySelector('#client-user-default').value.trim();
      if (defaultValue) {
        issuer['user-identity-claim']['default-value'] = defaultValue;
      }
    }

    if (customerToggle.checked) {
      issuer['customer-identity-claim'] = {
        type: 'string',
        description: DEFAULT_CUSTOMER_IDENTITY_DESCRIPTION,
        required: document.querySelector('#client-customer-required').value
      };
      const defaultValue = document.querySelector('#client-customer-default').value.trim();
      if (defaultValue) {
        issuer['customer-identity-claim']['default-value'] = defaultValue;
      }
    }

    return {
      'allow-multiple-issuers': allowMultiple,
      issuer
    };
  };

  const buildWebLaunchSof = () => {
    const mode = webLaunchMode.value;
    if (mode === 'token') {
      return undefined;
    }
    const defaultValue = document.querySelector('#web-sof-default').value.trim();

    const result = {
      name: DEFAULT_ISSUER_NAME,
      type: 'url',
      description: DEFAULT_SOF_DESCRIPTION,
      required: 'yes'
    };
    if (defaultValue) {
      result['default-value'] = defaultValue;
    }
    return result;
  };

  const buildWebLaunchToken = () => {
    const mode = webLaunchMode.value;
    if (mode === 'sof') {
      return undefined;
    }
    const reuse = webTokenReuse.value;
    let allowMultiple = 'no';
    if (reuse === 'no') {
      allowMultiple = document.querySelector('#web-token-multi')?.value ?? 'no';
    }

    const config = {
      'use-client-authentication': reuse,
      'allow-multiple-issuers': allowMultiple
    };

    if (reuse === 'no') {
      const issuers = [];
      const items = webTokenIssuerList
        ? Array.from(webTokenIssuerList.querySelectorAll('.item'))
        : [];
      let userEntryAdded = false;

      items.forEach(item => {
        const entry = {
          name: DEFAULT_ISSUER_NAME,
          type: 'url',
          description: DEFAULT_TOKEN_ISSUER_DESCRIPTION,
          required: 'yes'
        };
        const accessDefault = item.querySelector('[data-field="access-default"]')?.value.trim() ?? '';
        if (accessDefault) {
          entry['default-value'] = accessDefault;
        }
        issuers.push(entry);

        const userToggle = item.querySelector('[data-field="user-toggle"]');
        if (userToggle?.checked && !userEntryAdded) {
          const userRequired = item.querySelector('[data-field="user-required"]')?.value ?? 'no';
          const userDefault = item.querySelector('[data-field="user-default"]')?.value.trim() ?? '';
          const userEntry = {
            name: 'user-identity-claim',
            type: 'string',
            description: DEFAULT_USER_IDENTITY_DESCRIPTION,
            required: userRequired
          };
          if (userDefault) {
            userEntry['default-value'] = userDefault;
          }
          issuers.push(userEntry);
          userEntryAdded = true;
        }
      });

      if (issuers.length) {
        config.issuer = issuers;
      }
    }
    return config;
  };

  const buildContextRetrieval = () => {
    const rows = getContextRows();
    if (!rows.length) {
      return undefined;
    }

    const selected = rows
      .map(row => {
        const select = row.querySelector('.context-select');
        const descriptionInput = row.querySelector('.context-description');
        const requiredCheckbox = row.querySelector('.context-required');
        if (!select || !select.value) {
          return null;
        }
        const key = select.value;
        const meta = CONTEXT_ITEMS[key] || {};
        return {
          name: key,
          type: meta.type || 'string',
          description: descriptionInput ? descriptionInput.value.trim() : '',
          required: requiredCheckbox && requiredCheckbox.checked ? 'yes' : 'no'
        };
      })
      .filter(Boolean);

    return selected.length ? { instance: selected } : undefined;
  };

  const gatherPublisher = () => {
    if (!includePublisherToggle.checked) {
      return undefined;
    }
    return {
      publisherId: document.querySelector('#publisher-id').value.trim(),
      publisherName: document.querySelector('#publisher-name').value.trim(),
      websiteUrl: document.querySelector('#publisher-website').value.trim(),
      privacyPolicyUrl: document.querySelector('#publisher-privacy').value.trim(),
      supportUrl: document.querySelector('#publisher-support').value.trim(),
      contactEmail: document.querySelector('#publisher-email').value.trim(),
      offerId: document.querySelector('#publisher-offer').value.trim(),
      version: '0.0.1',
      defaultLocale: 'en-US',
      supportedLocales: ['en-US'],
      scope: 'US',
      regions: ['US']
    };
  };

  const resetForm = () => {
    clearErrors();

    if (outputContent) {
      outputContent.hidden = true;
    }

    manifestOutput.value = '';
    publisherOutput.value = '';
    resizeTextarea(manifestOutput);
    resizeTextarea(publisherOutput);

    document.querySelectorAll('input, select, textarea').forEach(element => {
      if (
        element.closest('#server-auth-list') ||
        element.closest('#web-token-issuer-list') ||
        element.closest('#context-item-list')
      ) {
        return;
      }

      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          element.checked = element.defaultChecked;
        } else {
          element.value = element.defaultValue || '';
        }
      } else if (element instanceof HTMLSelectElement) {
        const defaultIndex = Array.from(element.options).findIndex(option => option.defaultSelected);
        element.selectedIndex = defaultIndex === -1 ? 0 : defaultIndex;
      } else if (element instanceof HTMLTextAreaElement) {
        element.value = element.defaultValue || '';
        resizeTextarea(element);
      }
    });

  state.serverAuthIndex = 0;
  serverAuthList.innerHTML = '';
  createServerAuthItem();

    state.webTokenIssuerIndex = 0;
    webTokenIssuerList.innerHTML = '';

    contextList.innerHTML = '';
    updateAddContextButtonState();

  resetManualNoteState();
  noteStrategySelect.value = noteStrategySelect.options[0]?.value || 'all';
  renderManualNoteConfig();

    webLaunchMode.value = 'both';
    toggleWebLaunchSections();

    webTokenReuse.value = 'yes';
    handleWebTokenReuseChange();

    userFields.style.display = userToggle.checked ? 'grid' : 'none';
    customerFields.style.display = customerToggle.checked ? 'grid' : 'none';

    setPublisherVisibility();
    updateUploadNote('partner-integration', '0.0.1');
  };

  const handleGenerate = () => {
    const validationErrors = validateRequiredFields();
    if (validationErrors.length) {
      renderErrors(validationErrors);
      return;
    }
    clearErrors();

    const rawName = document.querySelector('#integration-name').value.trim();
    const normalizedName = rawName
      ? rawName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : '';
    const manifestName = normalizedName || 'partner-integration';
    const manifestDescription = buildManifestDescription(rawName || manifestName);

    const partnerIdValue = partnerIdInput ? partnerIdInput.value.trim() : '';

    const manifest = {
      name: manifestName,
      description: manifestDescription,
      version: document.querySelector('#integration-version').value.trim() || '0.0.1',
      'partner-id': partnerIdValue || generateGuid()
    };

    const serverAuth = gatherServerAuthentication();
    if (serverAuth.length) {
      manifest['server-authentication'] = serverAuth;
    }

    const noteSections = gatherNoteSections();
    if (noteSections) {
      manifest['note-sections'] = noteSections;
    }

    const instance = {
      'client-authentication': buildClientAuthentication()
    };

    const sof = buildWebLaunchSof();
    if (sof) {
      instance['web-launch-sof'] = sof;
    }

    const token = buildWebLaunchToken();
    if (token) {
      instance['web-launch-token'] = token;
    }

    const contextRetrieval = buildContextRetrieval();
    if (contextRetrieval) {
      instance['context-retrieval'] = contextRetrieval;
    }

    manifest.instance = instance;

    try {
      let yamlText = dumpYaml(manifest, { lineWidth: -1 });
      if (typeof yamlText === 'string') {
        yamlText = toPlainYesNo(sanitizeNotePlaceholders(yamlText));
      }
      manifestOutput.value = yamlText;
    } catch (error) {
      console.error(error);
      renderErrors(['Unable to generate YAML output. Refresh the page after verifying your network connection.']);
      manifestOutput.value = '';
      publisherOutput.value = '';
      resizeTextarea(manifestOutput);
      resizeTextarea(publisherOutput);
      return;
    }

    const publisher = gatherPublisher();
    publisherOutput.value = publisher ? JSON.stringify(publisher, null, 2) : '';
    const hasPublisher = publisherOutput.value.trim().length > 0;

    const outputGrid = document.querySelector('.output-grid');
    const yamlPanel = document.querySelector('[data-output="yaml"]');
    const jsonPanel = document.querySelector('[data-output="json"]');

    if (jsonPanel) {
      jsonPanel.hidden = !hasPublisher;
      jsonPanel.style.display = hasPublisher ? 'flex' : 'none';
    }
    if (yamlPanel) {
      yamlPanel.classList.toggle('single', !hasPublisher);
    }
    if (outputGrid) {
      outputGrid.classList.toggle('single-column', !hasPublisher);
    }

    if (outputContent) {
      outputContent.hidden = false;
    }

    const performResize = () => {
      if (manifestOutput) {
        resizeTextarea(manifestOutput);
      }
      if (publisherOutput) {
        if (hasPublisher) {
          resizeTextarea(publisherOutput);
        } else {
          publisherOutput.style.height = '';
        }
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(performResize);
    } else {
      performResize();
    }

    updateUploadNote(manifest.name, manifest.version);
  };

  const handleDownload = event => {
    const target = event.currentTarget;
    const type = target.dataset.download;
    let content = '';
    let filename = '';

    if (type === 'yaml') {
      content = manifestOutput.value;
      filename = 'integration.yaml';
    } else if (type === 'json') {
      content = publisherOutput.value;
      filename = 'publisher.json';
    }

    if (!content) {
      return;
    }

    const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/yaml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  addServerAuthBtn.addEventListener('click', () => createServerAuthItem());
  addWebTokenIssuerBtn.addEventListener('click', addWebTokenIssuer);
  if (addContextItemBtn) {
    addContextItemBtn.addEventListener('click', addContextItem);
  }
  noteStrategySelect.addEventListener('change', renderManualNoteConfig);
  webLaunchMode.addEventListener('change', toggleWebLaunchSections);
  webTokenReuse.addEventListener('change', handleWebTokenReuseChange);
  includePublisherToggle.addEventListener('change', setPublisherVisibility);
  userToggle.addEventListener('change', () => {
    userFields.style.display = userToggle.checked ? 'grid' : 'none';
  });
  customerToggle.addEventListener('change', () => {
    customerFields.style.display = customerToggle.checked ? 'grid' : 'none';
  });
  if (partnerIdGenerateBtn && partnerIdInput) {
    partnerIdGenerateBtn.addEventListener('click', () => {
      const newGuid = generateGuid();
      partnerIdInput.value = newGuid;
      partnerIdInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  generateBtn.addEventListener('click', handleGenerate);
  resetBtn.addEventListener('click', resetForm);
  downloadButtons.forEach(button => button.addEventListener('click', handleDownload));

  userFields.style.display = userToggle.checked ? 'grid' : 'none';
  customerFields.style.display = customerToggle.checked ? 'grid' : 'none';
  updateUploadNote('partner-integration', '0.0.1');
  clearErrors();

  resizeTextarea(manifestOutput);
  resizeTextarea(publisherOutput);

  if (outputContent) {
    outputContent.hidden = true;
  }

  // Initial render
  resetManualNoteState();
  createServerAuthItem(SAMPLE_SERVER_AUTH);
  renderManualNoteConfig();
  updateAddContextButtonState();
  addWebTokenIssuer();
  toggleWebLaunchSections();
  handleWebTokenReuseChange();
  setPublisherVisibility();
});
