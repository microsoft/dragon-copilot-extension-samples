let serverAuthList;
let addServerAuthBtn;
let contextItemsContainer;
let addContextBtn;
let generateBtn;
let resetBtn;
let manifestOutput;
let downloadYamlBtn;
let downloadPublisherBtn;
let webLaunchModeSelect;
let useClientAuthSelect;
let webLaunchSofConfig;
let webLaunchTokenConfig;
let webLaunchSofUrlInput;
let noteStrategySelect;
let manualNoteContainer;
let accessTokenIssuerInput;
let userClaimToggle;
let userClaimFields;
let userClaimDefaultInput;
let userClaimRequiredSelect;
let customerClaimToggle;
let customerClaimFields;
let customerClaimDefaultInput;
let customerClaimRequiredSelect;
let allowMultipleClientSelect;
let tokenDirectFields;
let tokenAccessIssuerInput;
let tokenUserToggle;
let tokenUserFields;
let tokenUserDefaultInput;
let tokenUserRequiredSelect;
let partnerIdInput;
let partnerIdGenerateBtn;
let integrationNameInput;
let integrationVersionInput;
let clinicalApplicationInput;
let includePublisherToggle;
let publisherFields;
let publisherOutput;
let publisherOutputPanel;
let errorPanel;

let publisherIdInput;
let publisherNameInput;
let publisherWebsiteInput;
let publisherPrivacyInput;
let publisherSupportInput;
let publisherEmailInput;
let publisherOfferInput;
let outputGrid;
let assetsHelper;
let downloadAssetsBtn;
let outputContentSection;

const DEFAULT_NOTE_SECTIONS = `hpi:
  - hpi
  - chief-complaint
chief-complaint:
past-medical-history:
assessment:
  - assessment
  - plan
medications:
allergies:
review-of-systems:
physical-exam: physical-exam
procedures: procedures
results: results`;
const DEFAULT_NOTE_SECTIONS_OBJECT = window.jsyaml.load(DEFAULT_NOTE_SECTIONS);
const OPTIONAL_NOTE_SECTIONS_OBJECT = {};

const JSZIP_LIB = typeof window !== 'undefined' && window.JSZip ? window.JSZip : null;
const SAMPLE_LOGO_BASE64 =
  'ACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAGOvj4+nnqWM8fnv7GgwjACW+nD7/uvymbzQON2G2fa8/v36ZOAZbEYAS206Kq+PX4+nDm+MX6L3Sd4zvDxPHYxMCUKIwAC9GzcT5dvp+eeCNR837yCQAJfYJwJ/x+/T54+X5bOPD19+XBxsyBGAcASixZwD+jo33Cj49Xh5g3BCAcQSgxAECcB6b7A/UvxcBGEcAStRPmtmxMgKVV/6nIQDjCECJAwXgPBbeDlTd818OARhHAEq0B6Dpy/7w4/Lfukf38/W1x2xYecwFpukzYREBKLFxAF6YmzS3x4/Tp4nXm7b0Ud/yJxAv31fvZ0I7ASgxLgC9r/9qNN4KLIlM9wpjxvnYyz4TWghAifYJuubL3r9B17AKWPALvzXvgVoCUKImAD3HeRq3rtS9V/915081ASjRPjHXT6DO+/Wrm3N9r3UrJhyPAJSoDEDvVfvKbUDPzv/VkHBUAlCiNgC9V+65Y/bsKcy9BscmACWqA9C3Cpheuref89VVBIcmACXaJ9NWAehavk89DuzZ/Z/6f+6CAJTYIQA9twFTE7gjINudM9UEoMQeAWg/5tQGXvstxPJf+7E/ASjRPhnvLwDu/++ZAJRon4xHCUD7EwABuGcCUKJ9MgoAlQSgRPtkFAAqCUCJ9skoAFQSgBLtk3G7AKx7DNgeAE8B7pkAlNghAB0/5Jn6JWD7U4ANz5lyAlCiPgBrJ3DP/08FhPsgACWqA9B+vNklfMcvAaf2ELgPAlCifUJuEoCO5f/s5O15jbmIcHgCUKI2AO0beNeW7+3n/N+Y2Ejk+ASgRPtkWh2AnqX7jSt3T0jOY/W5U04ASlQFoOPR33nMLf+fdMXkPPwm4N4IQImKAHRO/qZjtZ/38xCBeyIAJdon0u1JOaFrw+7vaLxn73kc+Dyu31r0ON+GLPpMaCIAJUYFoP11X4+eCdq/svh/NEZmysv9h77PhB4CUKJ9orZ82ZddlZ9HyzFe6d4LeDtuH3P+M7r9vywlACXmv9zVY/6x33W9TwS2HAIwjgCUOEgAVizJV90KrBwCMI4AlNg/AEuv/K8s2WzcYAjAOAJQYt8AbDqBdojApufPKwJQYqcA3Pqhz2K1twMCMI4AlKgOQM2Pcao2BgVgHAEoURSAVZt8S41/bwIwjgCUGDRJhi3xl9l2RVCzikknAIzRvVlowu9BACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAgmABAMAGAYAIAwQQAggkABBMACCYAEEwAIJgAQDABgGACAMEEAIIJAAQTAAgmABBMACCYAEAwAYBgAgDBBACCCQAEEwAIJgAQTAAg2L9z0nt1z4GMZAAAAABJRU5ErkJggg==';
const SAMPLE_LOGO_FILENAME = 'logo_large.png';
function normalizeIntegrationName(value) {
  if (!value) {
    return '';
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, ' ');

  return normalized;
}

function bindDomElements() {
  serverAuthList = document.getElementById('server-auth-list');
  addServerAuthBtn = document.getElementById('add-server-auth');
  contextItemsContainer = document.getElementById('context-item-list');
  addContextBtn = document.getElementById('add-context-item');
  generateBtn = document.getElementById('generate');
  resetBtn = document.getElementById('reset');
  manifestOutput = document.getElementById('manifest-output');
  downloadYamlBtn = document.querySelector('[data-download="yaml"]');
  downloadPublisherBtn = document.querySelector('[data-download="json"]');
  webLaunchModeSelect = document.getElementById('web-launch-mode');
  useClientAuthSelect = document.getElementById('web-launch-use-client');
  webLaunchSofConfig = document.getElementById('web-launch-sof-config');
  webLaunchTokenConfig = document.getElementById('web-launch-token-config');
  webLaunchSofUrlInput = document.getElementById('web-launch-sof-url');
  noteStrategySelect = document.getElementById('note-strategy');
  manualNoteContainer = document.getElementById('manual-note-config');
  accessTokenIssuerInput = document.getElementById('client-access-issuer');
  userClaimToggle = document.getElementById('client-include-user');
  userClaimFields = document.getElementById('client-user-fields');
  userClaimDefaultInput = document.getElementById('client-user-default');
  userClaimRequiredSelect = document.getElementById('client-user-required');
  customerClaimToggle = document.getElementById('client-include-customer');
  customerClaimFields = document.getElementById('client-customer-fields');
  customerClaimDefaultInput = document.getElementById('client-customer-default');
  customerClaimRequiredSelect = document.getElementById('client-customer-required');
  allowMultipleClientSelect = document.getElementById('client-allow-multiple');
  tokenDirectFields = document.getElementById('token-direct-fields');
  tokenAccessIssuerInput = document.getElementById('token-access-issuer');
  tokenUserToggle = document.getElementById('token-include-user');
  tokenUserFields = document.getElementById('token-user-fields');
  tokenUserDefaultInput = document.getElementById('token-user-default');
  tokenUserRequiredSelect = document.getElementById('token-user-required');
  partnerIdInput = document.getElementById('partner-id');
  partnerIdGenerateBtn = document.getElementById('generate-partner-id');
  integrationNameInput = document.getElementById('integration-name');
  integrationVersionInput = document.getElementById('integration-version');
  clinicalApplicationInput = document.getElementById('clinical-application');
  includePublisherToggle = document.getElementById('include-publisher');
  publisherFields = document.getElementById('publisher-fields');
  publisherOutput = document.getElementById('publisher-output');
  publisherOutputPanel = document.querySelector('[data-output="json"]');
  errorPanel = document.getElementById('form-errors');
  publisherIdInput = document.getElementById('publisher-id');
  publisherNameInput = document.getElementById('publisher-name');
  publisherWebsiteInput = document.getElementById('publisher-website');
  publisherPrivacyInput = document.getElementById('publisher-privacy');
  publisherSupportInput = document.getElementById('publisher-support');
  publisherEmailInput = document.getElementById('publisher-email');
  publisherOfferInput = document.getElementById('publisher-offer');
  outputGrid = document.querySelector('#output-content .output-grid');
  assetsHelper = document.getElementById('assets-helper');
  downloadAssetsBtn = document.getElementById('download-assets');
  outputContentSection = document.getElementById('output-content');
}

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
    description: 'issuer claim of access tokens used by the partner to call Dragon Copilot Interop',
    required: 'yes'
  },
  'out-bound-issuer': {
    type: 'url',
    description: 'endpoint used to issue access token for Dragon Copilot Interop to call partner',
    required: 'yes'
  },
  'out-bound-client-id': {
    type: 'string',
    description: 'Partner-provided client ID used to issue access tokens for Dragon Copilot Interop to call the partner',
    required: 'yes'
  },
  'out-bound-secret': {
    type: 'string',
    description: 'Partner-provided secret used to issue access tokens for Dragon Copilot Interop to call the partner',
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

const NOTE_SECTION_ORDER = [
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
];

let manualNoteCache = {};
let previousNoteStrategy = noteStrategySelect ? noteStrategySelect.value : 'all';

const manualNoteState = {
  availableKeys: NOTE_KEYS.slice(),
  structure: []
};

let isManualRenderSuppressed = false;
let currentNoteDrag = null;

function sortManualKeys() {
  manualNoteState.availableKeys.sort((a, b) => NOTE_KEYS.indexOf(a) - NOTE_KEYS.indexOf(b));
}

function resetManualNoteState() {
  manualNoteState.availableKeys = NOTE_KEYS.slice();
  manualNoteState.structure = [];
  sortManualKeys();
}

function removeKeyFromAvailable(key) {
  manualNoteState.availableKeys = manualNoteState.availableKeys.filter(entry => entry !== key);
}

function addKeysToAvailable(keys) {
  manualNoteState.availableKeys = Array.from(
    new Set([...manualNoteState.availableKeys, ...keys.filter(Boolean)])
  );
  sortManualKeys();
}

sortManualKeys();

function getContextRows() {
  if (!contextItemsContainer) {
    return [];
  }
  return Array.from(contextItemsContainer.querySelectorAll('.context-item-row'));
}

function computeAvailableContextKeys(excludeRow) {
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
}

function updateAddContextButtonState() {
  if (!addContextBtn) {
    return;
  }
  addContextBtn.disabled = computeAvailableContextKeys(null).length === 0;
}

function applyContextMetadata(row, key, { reset = false } = {}) {
  const meta = CONTEXT_ITEMS[key] || null;
  const descriptionInput = row.querySelector('.context-description');
  if (descriptionInput) {
    const description = meta ? meta.description : '';
    descriptionInput.value = description;
    descriptionInput.placeholder = description;
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
}

function updateContextRowOptions(row, { preserveValues = true } = {}) {
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
    select.append(option);
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
}

function updateAllContextRowOptions() {
  getContextRows().forEach(row => updateContextRowOptions(row, { preserveValues: true }));
  updateAddContextButtonState();
}

function handleContextSelectionChange(row) {
  const select = row.querySelector('.context-select');
  if (!select) {
    return;
  }
  applyContextMetadata(row, select.value, { reset: true });
  updateAllContextRowOptions();
}

function addContextRow(initialKey) {
  if (!contextItemsContainer) {
    return;
  }

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
  includeLabel.append(select);
  row.append(includeLabel);

  const descriptionLabel = document.createElement('label');
  descriptionLabel.textContent = 'Description (auto)';
  const descriptionInput = document.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.readOnly = true;
  descriptionInput.className = 'context-description';
  descriptionLabel.append(descriptionInput);
  row.append(descriptionLabel);

  const requiredLabel = document.createElement('label');
  requiredLabel.className = 'context-required-wrapper';
  const requiredHeading = document.createElement('span');
  requiredHeading.className = 'context-required-label';
  requiredHeading.textContent = 'Required';
  requiredLabel.append(requiredHeading);
  const requiredCheckbox = document.createElement('input');
  requiredCheckbox.type = 'checkbox';
  requiredCheckbox.className = 'context-required';
  requiredCheckbox.setAttribute('aria-label', 'Required');
  requiredLabel.append(requiredCheckbox);
  row.append(requiredLabel);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'secondary context-remove';
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', 'Remove context item');
  row.append(removeBtn);

  select.addEventListener('change', () => handleContextSelectionChange(row));
  requiredCheckbox.addEventListener('change', () => {
    row.dataset.requiredEdited = 'true';
  });
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateAllContextRowOptions();
  });

  contextItemsContainer.append(row);
  updateContextRowOptions(row, { preserveValues: false });

  if (initialKey && CONTEXT_ITEMS[initialKey]) {
    const options = Array.from(select.options).map(option => option.value);
    if (options.includes(initialKey)) {
      select.value = initialKey;
      applyContextMetadata(row, initialKey, { reset: true });
    }
  }

  updateAllContextRowOptions();
}

function gatherContextItems() {
  const entries = [];
  getContextRows().forEach(row => {
    const key = row.dataset.contextKey;
    if (!key) {
      return;
    }

    const meta = CONTEXT_ITEMS[key];
    if (!meta) {
      return;
    }

    const requiredCheckbox = row.querySelector('.context-required');
    const required = requiredCheckbox?.checked ? 'yes' : 'no';

    entries.push({
      name: key,
      type: meta.type,
      description: meta.description,
      required
    });
  });
  return entries;
}

function findMainNode(key) {
  return manualNoteState.structure.find(node => node.key === key);
}

function keyInStructure(key) {
  return manualNoteState.structure.some(node => node.key === key || node.children.includes(key));
}

function addMainSection(key) {
  if (!NOTE_KEYS.includes(key) || keyInStructure(key) || !manualNoteState.availableKeys.includes(key)) {
    return;
  }
  removeKeyFromAvailable(key);
  manualNoteState.structure.push({ key, children: [] });
  if (!isManualRenderSuppressed) {
    renderManualNoteConfig();
  }
}

function addSubSection(parentKey, childKey) {
  if (!NOTE_KEYS.includes(childKey) || keyInStructure(childKey) || !manualNoteState.availableKeys.includes(childKey)) {
    return;
  }
  const parent = findMainNode(parentKey);
  if (!parent) {
    return;
  }
  removeKeyFromAvailable(childKey);
  parent.children.push(childKey);
  if (!isManualRenderSuppressed) {
    renderManualNoteConfig();
  }
}

function removeMainSection(key) {
  const index = manualNoteState.structure.findIndex(node => node.key === key);
  if (index === -1) {
    return;
  }
  const [removed] = manualNoteState.structure.splice(index, 1);
  addKeysToAvailable([removed.key, ...removed.children]);
  if (!isManualRenderSuppressed) {
    renderManualNoteConfig();
  }
}

function removeChildSection(parentKey, childKey) {
  const parent = findMainNode(parentKey);
  if (!parent) {
    return;
  }
  parent.children = parent.children.filter(key => key !== childKey);
  addKeysToAvailable([childKey]);
  if (!isManualRenderSuppressed) {
    renderManualNoteConfig();
  }
}

function createNoteChip(key) {
  const chip = document.createElement('div');
  chip.className = 'note-chip';
  chip.draggable = true;
  chip.dataset.source = 'available';
  chip.dataset.key = key;
  chip.textContent = key;
  chip.addEventListener('dragstart', event => {
    currentNoteDrag = { source: 'available', key };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', key);
    chip.classList.add('dragging');
  });
  chip.addEventListener('dragend', () => {
    currentNoteDrag = null;
    chip.classList.remove('dragging');
  });
  return chip;
}

function allowNoteDrop(event) {
  if (!currentNoteDrag || currentNoteDrag.source !== 'available') {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleHierarchyDrop(event) {
  if (!currentNoteDrag || currentNoteDrag.source !== 'available') {
    return;
  }
  const target = event.currentTarget;
  if (!target || target.dataset.role !== 'main-drop') {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  addMainSection(currentNoteDrag.key);
}

function handleChildDrop(event) {
  if (!currentNoteDrag || currentNoteDrag.source !== 'available') {
    return;
  }
  const parentKey = event.currentTarget.dataset.parent;
  if (!parentKey) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  addSubSection(parentKey, currentNoteDrag.key);
}

function createChildNode(parentKey, childKey) {
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
}

function createMainNode(node) {
  const container = document.createElement('div');
  container.className = 'note-node';
  container.dataset.key = node.key;

  const header = document.createElement('div');
  header.className = 'note-node-header';
  header.dataset.parent = node.key;
  header.addEventListener('dragover', allowNoteDrop);
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
  childList.addEventListener('dragover', allowNoteDrop);
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
}

function createHierarchyDropZone({ showText = false, text = '' } = {}) {
  const zone = document.createElement('div');
  zone.className = 'note-dropzone';
  zone.dataset.role = 'main-drop';
  if (showText) {
    zone.textContent = text;
  } else {
    zone.classList.add('note-dropzone-compact');
  }
  zone.addEventListener('dragover', allowNoteDrop);
  zone.addEventListener('drop', handleHierarchyDrop);
  return zone;
}

function renderManualNoteConfig() {
  if (!manualNoteContainer) {
    return;
  }

  manualNoteContainer.innerHTML = '';
  manualNoteContainer.classList.toggle('manual-note-active', noteStrategySelect?.value === 'manual');
  if (!noteStrategySelect || noteStrategySelect.value !== 'manual') {
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
  hierarchyHint.textContent = 'Drop desired sections here to generate. Drop additional sections into a section to map subsections.';
  hierarchy.appendChild(hierarchyHint);

  const hierarchyList = document.createElement('div');
  hierarchyList.className = 'note-hierarchy-list';
  hierarchyList.addEventListener('dragover', allowNoteDrop);

  if (!manualNoteState.structure.length) {
    const zone = createHierarchyDropZone({ showText: true, text: 'Drop desired sections here to generate.' });
    zone.classList.add('note-dropzone-inline');
    hierarchyList.appendChild(zone);

    const empty = document.createElement('div');
    empty.className = 'note-hierarchy-empty';
    empty.textContent = 'Drag sections here to create your hierarchy.';
    hierarchyList.appendChild(empty);
  } else {
    manualNoteState.structure.forEach(node => {
      hierarchyList.appendChild(createMainNode(node));
    });

    const trailingZone = createHierarchyDropZone({ showText: true, text: 'Drop here to add another section' });
    trailingZone.classList.add('note-dropzone-inline');
    hierarchyList.appendChild(trailingZone);
  }

  hierarchy.appendChild(hierarchyList);
  builder.appendChild(pool);
  builder.appendChild(hierarchy);
  manualNoteContainer.appendChild(builder);
}

function manualStateToObject() {
  if (!manualNoteState.structure.length) {
    return undefined;
  }

  const map = {};
  manualNoteState.structure.forEach(node => {
    if (!node.children.length) {
      map[node.key] = node.key;
    } else {
      map[node.key] = [node.key, ...node.children];
    }
  });

  return Object.keys(map).length ? cloneNoteSections(map) : undefined;
}

function loadManualStateFromMap(map) {
  isManualRenderSuppressed = true;
  resetManualNoteState();

  if (map && typeof map === 'object') {
    NOTE_SECTION_ORDER.forEach(key => {
      if (!NOTE_KEYS.includes(key)) {
        return;
      }
      if (map[key] === undefined) {
        return;
      }

      addMainSection(key);
      const node = findMainNode(key);
      if (!node) {
        return;
      }

      const value = map[key];
      if (Array.isArray(value)) {
        value.forEach(entry => {
          const normalized = typeof entry === 'string' ? entry.trim() : String(entry || '').trim();
          if (!normalized || normalized === key || !NOTE_KEYS.includes(normalized)) {
            return;
          }
          addSubSection(key, normalized);
        });
      } else if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized && normalized !== key && NOTE_KEYS.includes(normalized)) {
          addSubSection(key, normalized);
        }
      }
    });
  }

  isManualRenderSuppressed = false;
  renderManualNoteConfig();
}

function handleNoteStrategyChange() {
  if (!noteStrategySelect) {
    return;
  }

  if (previousNoteStrategy === 'manual') {
    const manualState = manualStateToObject();
    if (manualState && Object.keys(manualState).length) {
      manualNoteCache = cloneNoteSections(manualState);
    }
  }

  const strategy = noteStrategySelect.value;

  if (strategy === 'manual') {
    const hasCachedManual = manualNoteCache && Object.keys(manualNoteCache).length > 0;
    loadManualStateFromMap(hasCachedManual ? cloneNoteSections(manualNoteCache) : undefined);
  } else if (manualNoteContainer) {
    manualNoteContainer.classList.remove('manual-note-active');
    manualNoteContainer.innerHTML = '';
  }

  previousNoteStrategy = strategy;
}

function collectNoteSections() {
  return manualStateToObject();
}

function getLaunchMode() {
  return webLaunchModeSelect ? webLaunchModeSelect.value : 'both';
}

function isSofLaunchEnabled() {
  const mode = getLaunchMode();
  return mode === 'both' || mode === 'smart-only';
}

function isTokenLaunchEnabled() {
  const mode = getLaunchMode();
  return mode === 'both' || mode === 'token-only';
}

function syncUserClaimFields() {
  if (!userClaimFields) {
    return;
  }
  const shouldShow = Boolean(userClaimToggle?.checked);
  userClaimFields.classList.toggle('is-hidden', !shouldShow);
}

function syncCustomerClaimFields() {
  if (!customerClaimFields) {
    return;
  }
  const shouldShow = Boolean(customerClaimToggle?.checked);
  customerClaimFields.classList.toggle('is-hidden', !shouldShow);
}

function syncTokenUserFields() {
  if (!tokenUserFields) {
    return;
  }
  const shouldShow = Boolean(tokenUserToggle?.checked) && !tokenUserToggle?.disabled;
  tokenUserFields.classList.toggle('is-hidden', !shouldShow);
  tokenUserFields.hidden = !shouldShow;

  if (tokenUserDefaultInput) {
    tokenUserDefaultInput.disabled = !shouldShow;
  }

  if (tokenUserRequiredSelect) {
    tokenUserRequiredSelect.disabled = !shouldShow;
  }

  tokenUserFields.setAttribute('aria-hidden', String(!shouldShow));
}

function syncLaunchModeSections() {
  const sofEnabled = isSofLaunchEnabled();
  const tokenEnabled = isTokenLaunchEnabled();

  if (webLaunchSofConfig) {
    webLaunchSofConfig.classList.toggle('is-hidden', !sofEnabled);
    webLaunchSofConfig.hidden = !sofEnabled;
    webLaunchSofConfig.setAttribute('aria-hidden', String(!sofEnabled));
  }

  if (webLaunchTokenConfig) {
    webLaunchTokenConfig.classList.toggle('is-hidden', !tokenEnabled);
    webLaunchTokenConfig.hidden = !tokenEnabled;
    webLaunchTokenConfig.setAttribute('aria-hidden', String(!tokenEnabled));
  }

  if (useClientAuthSelect) {
    useClientAuthSelect.disabled = !tokenEnabled;
    if (!tokenEnabled) {
      useClientAuthSelect.value = 'yes';
    }
  }

  if (!tokenEnabled) {
    if (tokenAccessIssuerInput) {
      tokenAccessIssuerInput.value = '';
    }
    if (tokenDirectFields) {
      tokenDirectFields.classList.add('is-hidden');
      tokenDirectFields.hidden = true;
      tokenDirectFields.setAttribute('aria-hidden', 'true');
    }
    if (tokenUserToggle) {
      tokenUserToggle.checked = false;
    }
  }

  syncTokenIssuerState();
}

function syncTokenIssuerState() {
  const tokenEnabled = isTokenLaunchEnabled();
  const reuseClient = useClientAuthSelect ? useClientAuthSelect.value === 'yes' : true;
  const showTokenFields = tokenEnabled && !reuseClient;

  if (tokenDirectFields) {
    tokenDirectFields.classList.toggle('is-hidden', !showTokenFields);
    tokenDirectFields.hidden = !showTokenFields;
    tokenDirectFields.setAttribute('aria-hidden', String(!showTokenFields));
  }

  if (tokenAccessIssuerInput) {
    tokenAccessIssuerInput.disabled = !showTokenFields;
  }

  if (tokenUserToggle) {
    tokenUserToggle.disabled = !showTokenFields;
    if (!showTokenFields) {
      tokenUserToggle.checked = false;
    }
  }

  syncTokenUserFields();
}

const DEFAULT_DESCRIPTION_FALLBACK = 'PARTNER INTEGRATION';
const DESCRIPTION_SUFFIX = ' for Dragon Copilot healthcare data processing.';

function sanitizeIntegrationNameForDescription(rawName) {
  if (!rawName || !rawName.trim()) {
    return DEFAULT_DESCRIPTION_FALLBACK;
  }

  const spaced = rawName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!spaced) {
    return DEFAULT_DESCRIPTION_FALLBACK;
  }

  return spaced.toUpperCase();
}

function ensureIntegrationSuffix(upperName) {
  return upperName.endsWith(' INTEGRATION') ? upperName : `${upperName} INTEGRATION`;
}

function buildManifestDescription(rawName) {
  const upperName = sanitizeIntegrationNameForDescription(rawName);
  return `${ensureIntegrationSuffix(upperName)}${DESCRIPTION_SUFFIX}`;
}

function createInfoButton(ariaLabel, tooltip) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'info-button';
  button.setAttribute('aria-label', ariaLabel);
  const symbol = document.createElement('span');
  symbol.className = 'info-symbol';
  symbol.textContent = 'i';
  symbol.setAttribute('aria-hidden', 'true');
  button.append(symbol);
  if (tooltip) {
    button.dataset.tooltip = tooltip;
  }
  return button;
}

function buildField(labelText, ariaLabel, tooltip, control) {
  const label = document.createElement('label');
  label.className = 'field';

  const heading = document.createElement('span');
  heading.className = 'field-heading';
  const headingText = document.createElement('span');
  headingText.textContent = labelText;
  heading.append(headingText);

  if (tooltip) {
    heading.append(createInfoButton(ariaLabel, tooltip));
  }

  label.append(heading, control);
  return label;
}

function generateGuid() {
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
}

function renderErrors(messages) {
  if (!errorPanel) {
    return;
  }
  const listItems = messages.map(message => `<li>${message}</li>`).join('');
  errorPanel.innerHTML = `<ul>${listItems}</ul>`;
  errorPanel.hidden = false;
  errorPanel.focus();
}

function clearErrors() {
  if (!errorPanel) {
    return;
  }
  errorPanel.hidden = true;
  errorPanel.innerHTML = '';
}

function parseYaml(yamlText) {
  if (typeof yamlText !== 'string' || !yamlText.trim()) {
    return null;
  }

  try {
    return window.jsyaml.load(yamlText);
  } catch (error) {
    console.error('Failed to parse YAML content', error);
    return null;
  }
}

function cloneNoteSections(source) {
  return JSON.parse(JSON.stringify(source || {}));
}

function resetOutputs() {
  if (manifestOutput) {
    manifestOutput.value = '';
  }
  if (publisherOutput) {
    publisherOutput.value = '';
  }
  if (downloadYamlBtn) {
    downloadYamlBtn.disabled = true;
  }
  if (downloadPublisherBtn) {
    downloadPublisherBtn.disabled = true;
  }
  togglePublisherArtifacts(includePublisherToggle ? includePublisherToggle.checked : false);

  if (outputContentSection) {
    outputContentSection.hidden = true;
  }
}

function setPublisherVisibility() {
  if (!includePublisherToggle || !publisherFields) {
    return;
  }

  const enabled = includePublisherToggle.checked;
  publisherFields.style.display = enabled ? 'grid' : 'none';

  if (!enabled) {
    if (publisherOutput) {
      publisherOutput.value = '';
    }
    if (downloadPublisherBtn) {
      downloadPublisherBtn.disabled = true;
    }
  } else if (downloadPublisherBtn && (!publisherOutput || !publisherOutput.value.trim())) {
    downloadPublisherBtn.disabled = true;
  }

  togglePublisherArtifacts(enabled);
}


function resolveNoteSections() {
  if (!noteStrategySelect) {
    return collectNoteSections();
  }

  const strategy = noteStrategySelect.value;

  if (strategy === 'all') {
    return cloneNoteSections(DEFAULT_NOTE_SECTIONS_OBJECT);
  }

  if (strategy === 'optional') {
    return Object.keys(OPTIONAL_NOTE_SECTIONS_OBJECT).length
      ? cloneNoteSections(OPTIONAL_NOTE_SECTIONS_OBJECT)
      : undefined;
  }

  if (strategy === 'manual') {
    const manual = collectNoteSections();
    if (!manual || Object.keys(manual).length === 0) {
      throw new Error('Add at least one note section when using manual selection.');
    }
    manualNoteCache = cloneNoteSections(manual);
    return manual;
  }

  return undefined;
}

function createInput(labelText, type = 'text', value = '', placeholder = '') {
  const label = document.createElement('label');
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  if (placeholder) {
    input.placeholder = placeholder;
  }

  label.appendChild(input);
  return { label, input };
}

function createSelect(labelText, options, currentValue) {
  const label = document.createElement('label');
  label.textContent = labelText;

  const select = document.createElement('select');
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    if (option === currentValue) opt.selected = true;
    select.appendChild(opt);
  });

  label.appendChild(select);
  return { label, select };
}

function renderServerAuthCard(data = {}, options = {}) {
  const { removable = true } = options;
  const card = document.createElement('div');
  card.className = 'dynamic-card';
  const header = document.createElement('header');
  const title = document.createElement('h3');
  title.textContent = 'Issuer';
  const infoBtn = createInfoButton(
    'Issuer field guidance',
    'Issuer URL and allowed identity claims used to validate server-to-server calls from your integration.'
  );

  const headerLeading = document.createElement('div');
  headerLeading.className = 'header-leading';
  headerLeading.append(title, infoBtn);
  header.append(headerLeading);

  if (removable) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-card';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => card.remove());
    header.append(removeBtn);
  }

  const issuerRow = document.createElement('div');
  issuerRow.className = 'grid server-auth-row issuer-row';

  const issuer = createInput(
    'Issuer URL',
    'text',
    data.issuer || '',
    'https://login.microsoftonline.com/[TENANT_ID]/v2.0'
  );
  issuer.label.classList.add('field-with-info');
  const issuerHeading = document.createElement('span');
  issuerHeading.className = 'field-label-text';
  issuerHeading.textContent = 'Issuer URL';
  const issuerRequired = document.createElement('span');
  issuerRequired.className = 'required';
  issuerRequired.textContent = '*';
  issuerHeading.append(issuerRequired);

  const issuerInfoWrapper = document.createElement('span');
  issuerInfoWrapper.className = 'info-wrapper info-inline';
  const issuerInfoButton = document.createElement('button');
  issuerInfoButton.type = 'button';
  issuerInfoButton.className = 'info-badge info-inline';
  issuerInfoButton.setAttribute('aria-label', 'Issuer URL guidance. The URL used to validate server authentication tokens from your integration.');
  const issuerInfoSymbol = document.createElement('span');
  issuerInfoSymbol.className = 'info-symbol';
  issuerInfoSymbol.setAttribute('aria-hidden', 'true');
  issuerInfoSymbol.textContent = 'i';
  issuerInfoButton.append(issuerInfoSymbol);
  const issuerTooltip = document.createElement('span');
  issuerTooltip.className = 'tooltip-content';
  issuerTooltip.setAttribute('role', 'tooltip');
  const issuerTooltipTitle = document.createElement('strong');
  issuerTooltipTitle.textContent = 'Issuer URL';
  const issuerTooltipBody = document.createElement('span');
  issuerTooltipBody.textContent = 'The URL used to validate server authentication tokens from your integration.';
  issuerTooltip.append(issuerTooltipTitle, issuerTooltipBody);
  issuerInfoWrapper.append(issuerInfoButton, issuerTooltip);
  issuerHeading.append(issuerInfoWrapper);

  issuer.label.textContent = '';
  issuer.label.append(issuerHeading, issuer.input);
  issuer.label.classList.add('full');
  issuerRow.append(issuer.label);

  const claimRow = document.createElement('div');
  claimRow.className = 'grid server-auth-row claim-row';

  const claim = createInput('Identity claim', 'text', data.identity_claim || '', 'azp');
  claim.label.classList.add('field-with-info');
  const claimHeading = document.createElement('span');
  claimHeading.className = 'field-label-text';
  claimHeading.textContent = 'Identity claim';
  const claimRequired = document.createElement('span');
  claimRequired.className = 'required';
  claimRequired.textContent = '*';
  claimHeading.append(claimRequired);
  claim.label.textContent = '';
  claim.label.append(claimHeading, claim.input);
  const identityValues = Array.isArray(data.identity_value)
    ? data.identity_value.join('\n')
    : typeof data.identity_value === 'string'
      ? data.identity_value
      : '';

  const valuesLabel = document.createElement('label');
  valuesLabel.className = 'field-with-info server-auth-identities';
  const valuesHeading = document.createElement('span');
  valuesHeading.className = 'field-label-text';
  valuesHeading.textContent = 'Allowed identity values (one per line)';
  const requiredStar = document.createElement('span');
  requiredStar.className = 'required';
  requiredStar.textContent = '*';
  valuesHeading.append(requiredStar);
  valuesLabel.append(valuesHeading);

  const valuesTextarea = document.createElement('textarea');
  valuesTextarea.rows = 4;
  valuesTextarea.placeholder = '00000000-0000-0000-0000-000000000000';
  valuesTextarea.value = identityValues;
  valuesTextarea.dataset.identityList = 'true';
  valuesLabel.append(valuesTextarea);

  claimRow.append(claim.label, valuesLabel);

  card.append(header, issuerRow, claimRow);
  card.dataset.type = 'server-auth';
  return card;
}

function gatherServerAuth() {
  const entries = [];
  serverAuthList.querySelectorAll('.dynamic-card').forEach(card => {
    const issuerInput = card.querySelector('.issuer-row input[type="text"]');
    const claimInput = card.querySelector('.claim-row input[type="text"]');
    const valuesTextarea = card.querySelector('textarea[data-identity-list="true"]');
    if (!issuerInput || !claimInput || !valuesTextarea) {
      return;
    }
    const rawValues = valuesTextarea.value
      .split(/\r?\n/)
      .map(value => value.trim())
      .filter(Boolean);
    if (!issuerInput.value.trim() || !claimInput.value.trim() || rawValues.length === 0) {
      return;
    }
    entries.push({
      issuer: issuerInput.value.trim(),
      identity_claim: claimInput.value.trim(),
      identity_value: rawValues
    });
  });
  return entries;
}

function buildClientAuth() {
  const accessDefault = accessTokenIssuerInput ? accessTokenIssuerInput.value.trim() : '';
  const issuerField = {
    type: 'url',
    description: 'Default issuer value applied when clients omit the access token issuer. Leave blank to require a client-supplied value.',
    required: 'no'
  };

  if (accessDefault) {
    issuerField['default-value'] = accessDefault;
  }

  const issuer = {
    'access-token-issuer': issuerField
  };

  if (userClaimToggle?.checked) {
    const userEntry = {
      type: 'string',
      description: 'Optional claim containing the EHR identity of an end user.',
      required: userClaimRequiredSelect ? userClaimRequiredSelect.value : 'no'
    };
    const defaultValue = userClaimDefaultInput ? userClaimDefaultInput.value.trim() : '';
    if (defaultValue) {
      userEntry['default-value'] = defaultValue;
    }
    issuer['user-identity-claim'] = userEntry;
  }

  if (customerClaimToggle?.checked) {
    const customerEntry = {
      type: 'string',
      description: 'Optional claim containing the Microsoft environment identifier.',
      required: customerClaimRequiredSelect ? customerClaimRequiredSelect.value : 'no'
    };
    const defaultValue = customerClaimDefaultInput ? customerClaimDefaultInput.value.trim() : '';
    if (defaultValue) {
      customerEntry['default-value'] = defaultValue;
    }
    issuer['customer-identity-claim'] = customerEntry;
  }

  return {
    'allow-multiple-issuers': allowMultipleClientSelect ? allowMultipleClientSelect.value : 'yes',
    issuer
  };
}

function buildWebLaunchTokenConfig() {
  if (!isTokenLaunchEnabled()) {
    return undefined;
  }

  if (!useClientAuthSelect || useClientAuthSelect.value === 'yes') {
    return {
      'use-client-authentication': 'yes'
    };
  }

  const issuerFields = [];
  const tokenIssuerField = {
    name: 'access-token-issuer',
    type: 'url',
    description: 'Issuer claim for partner-issued web launch tokens.',
    required: 'yes'
  };

  const tokenDefault = tokenAccessIssuerInput ? tokenAccessIssuerInput.value.trim() : '';
  if (tokenDefault) {
    tokenIssuerField['default-value'] = tokenDefault;
  }

  issuerFields.push(tokenIssuerField);

  if (tokenUserToggle?.checked) {
    const userEntry = {
      name: 'user-identity-claim',
      type: 'string',
      description: 'Optional claim containing the EHR identity of an end user.',
      required: tokenUserRequiredSelect ? tokenUserRequiredSelect.value : 'no'
    };
    const userDefault = tokenUserDefaultInput ? tokenUserDefaultInput.value.trim() : '';
    if (userDefault) {
      userEntry['default-value'] = userDefault;
    }
    issuerFields.push(userEntry);
  }

  return {
    'use-client-authentication': 'no',
    issuer: issuerFields
  };
}

function buildManifest() {
  const serverAuth = gatherServerAuth();
  if (serverAuth.length === 0) {
    throw new Error('At least one server authentication issuer is required.');
  }

  const noteSections = resolveNoteSections();
  const contextItems = gatherContextItems();
  const tokenConfig = buildWebLaunchTokenConfig();

  const rawName = integrationNameInput ? integrationNameInput.value.trim() : '';
  const manifestName = normalizeIntegrationName(rawName);
  if (!manifestName) {
    throw new Error('Integration name normalization failed. Enter a name with at least one letter or number.');
  }
  const description = buildManifestDescription(rawName || manifestName);
  const version = integrationVersionInput ? integrationVersionInput.value.trim() : '';
  let partnerIdValue = partnerIdInput ? partnerIdInput.value.trim() : '';
  const clinicalApplicationName = clinicalApplicationInput ? clinicalApplicationInput.value.trim() : '';

  if (!partnerIdValue && partnerIdInput) {
    partnerIdValue = generateGuid();
    partnerIdInput.value = partnerIdValue;
  }

  const manifest = {
    name: manifestName,
    description,
    version,
    'partner-id': partnerIdValue,
    'clinical-application-name': clinicalApplicationName,
    'server-authentication': serverAuth
  };

  if (noteSections) {
    manifest['note-sections'] = noteSections;
  }

  manifest.instance = {
    'client-authentication': buildClientAuth()
  };

  if (isSofLaunchEnabled()) {
    const sofDefault = webLaunchSofUrlInput ? webLaunchSofUrlInput.value.trim() : '';
    manifest.instance['web-launch-sof'] = {
      name: 'access-token-issuer',
      type: 'url',
      description: 'Issuer claim when invoking the Dragon Copilot SMART on FHIR endpoint.',
      required: 'yes'
    };
    if (sofDefault) {
      manifest.instance['web-launch-sof']['default-value'] = sofDefault;
    }
  }

  if (tokenConfig) {
    manifest.instance['web-launch-token'] = tokenConfig;
  }

  if (contextItems.length > 0) {
    manifest.instance['context-retrieval'] = {
      instance: contextItems
    };
  }

  return manifest;
}

function renderDefaults() {
  manualNoteCache = {};
  loadManualStateFromMap();

  if (serverAuthList) {
    serverAuthList.innerHTML = '';
    serverAuthList.append(renderServerAuthCard({}, { removable: false }));
  }

  if (contextItemsContainer) {
    contextItemsContainer.innerHTML = '';
  }

  if (tokenAccessIssuerInput) {
    tokenAccessIssuerInput.value = '';
  }

  if (tokenUserToggle) {
    tokenUserToggle.checked = false;
  }

  if (tokenUserDefaultInput) {
    tokenUserDefaultInput.value = 'sub';
  }

  if (tokenUserRequiredSelect) {
    tokenUserRequiredSelect.value = 'no';
  }

  if (noteStrategySelect) {
    noteStrategySelect.value = noteStrategySelect.options[0]?.value || 'all';
    previousNoteStrategy = noteStrategySelect.value;
    handleNoteStrategyChange();
  }

  if (webLaunchModeSelect) {
    webLaunchModeSelect.value = 'both';
  }

  if (useClientAuthSelect) {
    useClientAuthSelect.value = 'yes';
  }

  syncLaunchModeSections();
  setPublisherVisibility();
  syncUserClaimFields();
  syncCustomerClaimFields();
}

function validateRequiredFields() {
  const errors = [];

  if (!integrationNameInput || !integrationNameInput.value.trim()) {
    errors.push('Integration name is required.');
  } else if (!normalizeIntegrationName(integrationNameInput.value)) {
    errors.push('Integration name must include at least one letter or number.');
  }

  if (!integrationVersionInput || !integrationVersionInput.value.trim()) {
    errors.push('Integration version is required.');
  }

  if (!clinicalApplicationInput || !clinicalApplicationInput.value.trim()) {
    errors.push('Clinical application name is required.');
  }

  if (!serverAuthList || !serverAuthList.querySelector('.dynamic-card')) {
    errors.push('Add at least one server authentication issuer.');
  } else {
    // Validate that each server auth card has all required fields
    serverAuthList.querySelectorAll('.dynamic-card').forEach((card, index) => {
      const issuerInput = card.querySelector('.issuer-row input[type="text"]');
      const claimInput = card.querySelector('.claim-row input[type="text"]');
      const valuesTextarea = card.querySelector('textarea[data-identity-list="true"]');
      
      if (issuerInput && !issuerInput.value.trim()) {
        errors.push(`Server authentication issuer ${index + 1}: Issuer URL is required.`);
      }
      
      if (claimInput && !claimInput.value.trim()) {
        errors.push(`Server authentication issuer ${index + 1}: Identity claim is required.`);
      }
      
      if (valuesTextarea) {
        const rawValues = valuesTextarea.value
          .split(/\r?\n/)
          .map(value => value.trim())
          .filter(Boolean);
        if (rawValues.length === 0) {
          errors.push(`Server authentication issuer ${index + 1}: At least one identity value is required.`);
        }
      }
    });
  }

  if (includePublisherToggle && includePublisherToggle.checked) {
    const publisherFieldsRequired = [
      { input: publisherIdInput, label: 'Publisher ID' },
      { input: publisherNameInput, label: 'Publisher name' },
      { input: publisherWebsiteInput, label: 'Website URL' },
      { input: publisherPrivacyInput, label: 'Privacy policy URL' },
      { input: publisherSupportInput, label: 'Support URL' },
      { input: publisherEmailInput, label: 'Contact email' },
      { input: publisherOfferInput, label: 'Offer ID' }
    ];

    publisherFieldsRequired.forEach(({ input, label }) => {
      if (!input || !input.value.trim()) {
        errors.push(`${label} is required when generating publisher.json.`);
      }
    });
  }

  return errors;
}

function buildPublisherConfig() {
  if (!includePublisherToggle || !includePublisherToggle.checked) {
    return undefined;
  }

  return {
    publisherId: publisherIdInput ? publisherIdInput.value.trim() : '',
    publisherName: publisherNameInput ? publisherNameInput.value.trim() : '',
    websiteUrl: publisherWebsiteInput ? publisherWebsiteInput.value.trim() : '',
    privacyPolicyUrl: publisherPrivacyInput ? publisherPrivacyInput.value.trim() : '',
    supportUrl: publisherSupportInput ? publisherSupportInput.value.trim() : '',
    contactEmail: publisherEmailInput ? publisherEmailInput.value.trim() : '',
    offerId: publisherOfferInput ? publisherOfferInput.value.trim() : '',
    version: '0.0.1',
    defaultLocale: 'en-US',
    supportedLocales: ['en-US'],
    scope: 'EHR Connector',
    regions: ['US']
  };
}

function togglePublisherArtifacts(shouldShow) {
  const show = Boolean(shouldShow);

  if (outputGrid) {
    outputGrid.classList.toggle('single-column', !show);
  }

  if (publisherOutputPanel) {
    publisherOutputPanel.hidden = !show;
    publisherOutputPanel.style.display = show ? '' : 'none';
  }

  if (assetsHelper) {
    assetsHelper.hidden = !show;
  }

  if (downloadAssetsBtn) {
    const disableAssets = !show || !JSZIP_LIB;
    downloadAssetsBtn.disabled = disableAssets;
    downloadAssetsBtn.title = !JSZIP_LIB
      ? 'Sample assets download is unavailable because JSZip failed to load.'
      : '';
  }
}

async function downloadSampleAssets() {
  if (!JSZIP_LIB) {
    window.alert('Sample assets download is unavailable because JSZip failed to load.');
    return;
  }

  try {
    const zip = new JSZIP_LIB();
    const assetsFolder = zip.folder('assets');
    if (!assetsFolder) {
      throw new Error('Unable to create assets folder within archive.');
    }

    const logoBytes = Uint8Array.from(atob(SAMPLE_LOGO_BASE64), char => char.charCodeAt(0));
    assetsFolder.file(SAMPLE_LOGO_FILENAME, logoBytes, { binary: true });

    const readme = `This archive contains a placeholder logo to help you prepare partner submission assets.

Steps:
1. Replace assets/${SAMPLE_LOGO_FILENAME} with your branded image (PNG format).
2. Keep the assets folder beside extension.yaml and publisher.json before packaging.
3. Run the packaging script to include your logo in the final zip.
`;
    zip.file('README.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample-assets.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Failed to generate sample assets archive', error);
    window.alert('Unable to create the sample assets archive. Please try again.');
  }
}

function downloadContent(content, filename, mimeType) {
  if (!content || !content.trim()) {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function generateArtifacts() {
  const validationErrors = validateRequiredFields();
  if (validationErrors.length) {
    renderErrors(validationErrors);
    resetOutputs();
    return;
  }

  clearErrors();

  let manifest;
  try {
    manifest = buildManifest();
  } catch (error) {
    renderErrors([error.message]);
    resetOutputs();
    return;
  }

  try {
    let yaml = window.jsyaml.dump(manifest, { lineWidth: 120, noRefs: true });
    yaml = yaml.replace(/: null(\r?\n)/g, ':$1').replace(/: null$/g, ':');
    if (manifestOutput) {
      manifestOutput.value = yaml;
    }
    if (downloadYamlBtn) {
      downloadYamlBtn.disabled = false;
    }
  } catch (error) {
    console.error('Failed to serialize manifest to YAML', error);
    renderErrors(['Unable to generate extension.yaml. Try again after reloading the page.']);
    resetOutputs();
    return;
  }

  const publisherConfig = buildPublisherConfig();
  if (publisherConfig) {
    if (publisherOutput) {
      publisherOutput.value = JSON.stringify(publisherConfig, null, 2);
    }
    if (downloadPublisherBtn) {
      downloadPublisherBtn.disabled = false;
    }
  } else {
    if (publisherOutput) {
      publisherOutput.value = '';
    }
    if (downloadPublisherBtn) {
      downloadPublisherBtn.disabled = true;
    }
  }

  setPublisherVisibility();

  if (outputContentSection) {
    outputContentSection.hidden = false;
  }
}

function handleReset() {
  clearErrors();
  resetOutputs();

  document.querySelectorAll('input').forEach(input => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = input.defaultChecked;
      return;
    }

    if (input.closest('.dynamic-card')) {
      return;
    }

    input.value = input.defaultValue || '';
  });

  document.querySelectorAll('select').forEach(select => {
    if (select.closest('.dynamic-card')) {
      return;
    }

    const defaultOption = Array.from(select.options).find(option => option.defaultSelected);
    if (defaultOption) {
      select.value = defaultOption.value;
    } else if (select.options.length > 0) {
      select.selectedIndex = 0;
    }
  });

  document.querySelectorAll('textarea').forEach(textarea => {
    if (textarea.closest('.dynamic-card')) {
      return;
    }

    textarea.value = textarea.defaultValue || '';
  });

  manualNoteCache = {};
  renderDefaults();
}

function attachEventListeners() {
  if (addServerAuthBtn && serverAuthList) {
    addServerAuthBtn.addEventListener('click', () => {
      serverAuthList.append(renderServerAuthCard({}));
    });
  }

  if (addContextBtn && contextItemsContainer) {
    addContextBtn.addEventListener('click', () => {
      addContextRow();
    });
  }

  if (userClaimToggle) {
    userClaimToggle.addEventListener('change', syncUserClaimFields);
  }

  if (customerClaimToggle) {
    customerClaimToggle.addEventListener('change', syncCustomerClaimFields);
  }

  if (tokenUserToggle) {
    tokenUserToggle.addEventListener('change', syncTokenUserFields);
  }

  if (webLaunchModeSelect) {
    webLaunchModeSelect.addEventListener('change', syncLaunchModeSections);
  }

  if (useClientAuthSelect) {
    useClientAuthSelect.addEventListener('change', syncTokenIssuerState);
  }

  if (noteStrategySelect) {
    noteStrategySelect.addEventListener('change', handleNoteStrategyChange);
  }

  if (partnerIdGenerateBtn && partnerIdInput) {
    partnerIdGenerateBtn.addEventListener('click', () => {
      partnerIdInput.value = generateGuid();
      partnerIdInput.focus();
      partnerIdInput.select?.();
      clearErrors();
    });
  }

  if (includePublisherToggle) {
    includePublisherToggle.addEventListener('change', setPublisherVisibility);
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', generateArtifacts);
  }

  if (downloadYamlBtn) {
    downloadYamlBtn.addEventListener('click', () => {
      downloadContent(manifestOutput.value, 'extension.yaml', 'text/yaml');
    });
    downloadYamlBtn.disabled = true;
  }

  if (downloadPublisherBtn) {
    downloadPublisherBtn.addEventListener('click', () => {
      downloadContent(publisherOutput.value, 'publisher.json', 'application/json');
    });
    downloadPublisherBtn.disabled = true;
  }

  if (downloadAssetsBtn && JSZIP_LIB) {
    downloadAssetsBtn.addEventListener('click', downloadSampleAssets);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }
}

function initializeApp() {
  bindDomElements();
  attachEventListeners();
  resetOutputs();
  renderDefaults();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
