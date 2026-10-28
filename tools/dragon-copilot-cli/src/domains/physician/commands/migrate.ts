import fs from 'fs-extra';
const { readFileSync, writeFileSync } = fs;
import path from 'path';
import { parseDocument, stringify, isAlias, isMap, isSeq, isScalar } from 'yaml';
import type { Document, Node } from 'yaml';
import { isDeepStrictEqual } from 'util';
import chalk from 'chalk';
import { input, checkbox } from '@inquirer/prompts';
import type { MigrateOptions, ToolTrigger } from '../types.js';
import {
  getManifestSchemaVersion,
  isSupportedSchemaVersion,
  resolveRequestedSchemaVersion,
  validateExtensionManifest,
  validateFieldValue,
  LEGACY_SCHEMA_VERSION
} from '../shared/schema-validator.js';
import type { SchemaError } from '../shared/schema-validator.js';
import { TRIGGER_CHOICES, DEFAULT_TOOL_TIMEOUT_SECONDS, humanizeName } from '../shared/prompts.js';

type Manifest = Record<string, any>;

interface MigrationContext {
  interactive: boolean;
  changes: string[];
  problems: string[];
}

interface MigrationStep {
  from: string;
  to: string;
  apply: (manifest: Manifest, ctx: MigrationContext) => Promise<Manifest>;
}

const V030 = '0.3.0';

// Ordered oldest to newest; each step upgrades exactly one version so they can be chained.
const MIGRATION_STEPS: MigrationStep[] = [
  { from: LEGACY_SCHEMA_VERSION, to: V030, apply: migrateLegacyTo030 }
];

const MIGRATION_ORDER = [LEGACY_SCHEMA_VERSION, ...MIGRATION_STEPS.map(step => step.to)];

/** Schema versions reachable by `migrate`, oldest first. */
export function getMigrationVersions(): string[] {
  return [...MIGRATION_ORDER];
}

const INPUT_DATA_TO_CONTENT_TYPE: Record<string, string> = {
  'DSP/Note': 'application/vnd.ms-dragon.dsp.note+json',
  'DSP/Transcript': 'application/vnd.ms-dragon.dsp.transcript+json',
  'DSP/IterativeAudio': 'application/vnd.ms-dragon.dsp.iterative-audio+json',
  'DSP/IterativeTranscript': 'application/vnd.ms-dragon.dsp.iterative-transcript+json'
};

const OUTPUT_DATA_TO_CONTENT_TYPE: Record<string, string> = {
  DSP: 'application/vnd.ms-dragon.dsp+json'
};

const LEGACY_TRIGGER_MAP: Record<string, ToolTrigger> = {
  AutoRun: 'DataAvailable',
  AdaptiveCardAction: 'ExplicitRequest'
};

export async function migrateManifest(filePath: string, options: MigrateOptions): Promise<void> {
  console.log(chalk.blue('🐉 Migrating Dragon Copilot Physician Workflow Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  try {
    // Parsed as a Document so comments and anchors survive the rewrite.
    const document = parseDocument(readFileSync(filePath, 'utf8'), { merge: true });
    if (document.errors.length > 0) {
      throw new Error(document.errors[0]?.message ?? 'Invalid YAML');
    }
    const manifest = document.toJS() as Manifest;
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      throw new Error('Manifest is empty or not a YAML object');
    }

    const fromVersion = getManifestSchemaVersion(manifest);
    if (!isSupportedSchemaVersion(fromVersion)) {
      throw new Error(`Manifest uses unsupported schemaVersion "${fromVersion}"`);
    }
    const toVersion = resolveRequestedSchemaVersion(options.to);

    // Migrating an invalid source can produce output that validates but no longer reflects the author's intent.
    const sourceResult = validateExtensionManifest(manifest);
    if (!sourceResult.isValid) {
      printErrors(`❌ The manifest is not valid against ${describeVersion(fromVersion)}; fix it before migrating:`, sourceResult.errors);
      process.exitCode = 1;
      return;
    }

    const fromIndex = indexInMigrationOrder(fromVersion);
    const toIndex = indexInMigrationOrder(toVersion);
    if (fromIndex === toIndex) {
      console.log(chalk.green(`✅ Manifest is already at schema ${describeVersion(toVersion)}; nothing to migrate.`));
      return;
    }
    if (toIndex < fromIndex) {
      throw new Error(`Cannot migrate from ${describeVersion(fromVersion)} to older ${describeVersion(toVersion)}`);
    }

    console.log(chalk.gray(`Migrating from ${describeVersion(fromVersion)} to ${toVersion}...\n`));

    const ctx: MigrationContext = { interactive: !options.nonInteractive, changes: [], problems: [] };
    let migrated = manifest;
    for (const step of MIGRATION_STEPS.slice(fromIndex, toIndex)) {
      migrated = await step.apply(migrated, ctx);
    }

    printList('📝 Changes:', ctx.changes, chalk.gray);
    printList('⚠️  Needs attention:', ctx.problems, chalk.yellow);

    document.contents = reconcileNode(document, document.contents, migrated) as typeof document.contents;
    const yamlContent = serialize(document, migrated);
    const result = validateExtensionManifest(migrated);

    if (options.dryRun) {
      console.log(chalk.blue('\n📄 Migrated manifest (dry run, nothing written):\n'));
      console.log(yamlContent);
    }

    if (!result.isValid) {
      printErrors(`\n❌ The migrated manifest does not pass ${toVersion} validation:`, result.errors);
      console.log(chalk.yellow('\nFix the issues above in the original manifest and rerun migrate.'));
      process.exitCode = 1;
      return;
    }

    if (ctx.problems.length > 0) {
      console.log(chalk.red('\n❌ Resolve the items under "Needs attention" in the original manifest and rerun migrate.'));
      process.exitCode = 1;
      return;
    }

    if (options.dryRun) {
      console.log(chalk.green(`✅ Migrated manifest is valid against schema ${toVersion}.`));
      return;
    }

    const outputPath = options.inPlace ? filePath : getMigratedPath(filePath);
    writeFileSync(outputPath, yamlContent);
    console.log(chalk.green(`\n✅ Migrated manifest is valid against schema ${toVersion}.`));
    console.log(chalk.gray(`📁 Written to: ${outputPath}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(chalk.red(`❌ Migration failed: ${message}`));
    process.exitCode = 1;
  }
}

export function getMigratedPath(filePath: string): string {
  const ext = path.extname(filePath);
  return path.join(path.dirname(filePath), `${path.basename(filePath, ext)}.migrated${ext || '.yaml'}`);
}

function indexInMigrationOrder(version: string): number {
  const index = MIGRATION_ORDER.indexOf(version);
  if (index === -1) {
    throw new Error(`No migration path is defined for schema ${describeVersion(version)}`);
  }
  return index;
}

/**
 * Applies the migrated values onto the parsed document, reusing existing nodes where keys survive
 * so their comments and anchors are kept.
 */
function reconcileNode(document: Document, node: unknown, value: unknown): Node {
  if (isAlias(node) && isDeepStrictEqual(node.toJS(document), value)) {
    return node;
  }
  if (Array.isArray(value)) {
    if (!isSeq(node)) return document.createNode(value);
    node.items = value.map((item, index) => reconcileNode(document, node.items[index], item));
    return node;
  }
  if (value !== null && typeof value === 'object') {
    if (!isMap(node)) return document.createNode(value);
    const originalFirstKey = node.items[0]?.key;
    const existing = new Map(node.items.map(pair => [String(isScalar(pair.key) ? pair.key.value : pair.key), pair]));
    node.items = Object.entries(value).map(([key, child]) => {
      const pair = existing.get(key);
      if (!pair) return document.createPair(key, child);
      pair.value = reconcileNode(document, pair.value, child);
      return pair;
    });
    // A leading comment belongs to the top of the map, not to whichever key used to be first.
    const newFirstKey = node.items[0]?.key;
    if (isScalar(originalFirstKey) && originalFirstKey.commentBefore && isScalar(newFirstKey) && newFirstKey !== originalFirstKey) {
      newFirstKey.commentBefore = originalFirstKey.commentBefore;
      delete originalFirstKey.commentBefore;
    }
    return node;
  }
  if (isScalar(node) && node.value === value) return node;
  return document.createNode(value);
}

// An alias whose anchor was on a rewritten value can't be serialized; fall back to plain output.
function serialize(document: Document, migrated: Manifest): string {
  try {
    return document.toString({ lineWidth: 0 });
  } catch {
    console.log(chalk.yellow('⚠️  Could not preserve comments and anchors; writing the manifest without them.'));
    return stringify(migrated, { lineWidth: 0 });
  }
}

function lookup<T>(map: Record<string, T>, key: unknown): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, String(key)) ? map[String(key)] : undefined;
}

function printErrors(title: string, errors: SchemaError[]): void {
  console.log(chalk.red(title));
  errors.forEach(error => {
    const fieldName = error.instancePath.replace(/^\//, '').replace(/\//g, '.') || 'manifest';
    console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
  });
}

function describeVersion(version: string): string {
  return version === LEGACY_SCHEMA_VERSION ? 'the original format (no schemaVersion)' : version;
}

function printList(title: string, items: string[], color: (text: string) => string): void {
  if (items.length === 0) return;
  console.log(color(title));
  items.forEach(item => console.log(color(`  • ${item}`)));
}

async function migrateLegacyTo030(manifest: Manifest, ctx: MigrationContext): Promise<Manifest> {
  const { name, description, version, auth, tools, ...rest } = manifest;

  const migratedName = await ensureValidName(name, 'name', 'Extension name', V030, ctx);
  const caption = await resolveCaption('Extension caption (display name):', migratedName, 'caption', ctx);

  const migratedTools = [];
  for (const [index, tool] of (Array.isArray(tools) ? tools : []).entries()) {
    migratedTools.push(await migrateToolTo030(tool ?? {}, index, ctx));
  }

  ctx.changes.unshift(`Added schemaVersion: ${V030}`);

  return {
    schemaVersion: V030,
    name: migratedName,
    caption,
    description,
    version,
    auth,
    tools: migratedTools,
    ...rest
  };
}

async function migrateToolTo030(tool: Manifest, index: number, ctx: MigrationContext): Promise<Manifest> {
  const { name, description, trigger, endpoint, inputs, outputs, timeout, ...rest } = tool;
  const label = `tools[${index}]`;

  const migratedName = await ensureValidName(name, 'definitions.Tool.properties.name', `Tool name for ${label}`, V030, ctx);
  const caption = await resolveCaption(`Caption for tool "${migratedName}":`, migratedName, `${label}.caption`, ctx);

  ctx.changes.push(`${label}: added type: DragonAPI`);
  const triggers = await resolveTriggers(trigger, migratedName, label, ctx);
  const migratedOutputs = (Array.isArray(outputs) ? outputs : []).map((item: Manifest, i: number) =>
    convertDataField(item, `${label}.outputs[${i}]`, ctx, OUTPUT_DATA_TO_CONTENT_TYPE));
  if (migratedOutputs.length === 0 && outputs !== undefined) {
    ctx.changes.push(`${label}: removed empty outputs (outputs are optional in ${V030})`);
  }
  if (timeout === undefined) {
    ctx.changes.push(`${label}: added timeout: ${DEFAULT_TOOL_TIMEOUT_SECONDS}`);
  }

  return {
    name: migratedName,
    caption,
    description,
    type: 'DragonAPI',
    triggers,
    timeout: timeout ?? DEFAULT_TOOL_TIMEOUT_SECONDS,
    endpoint,
    inputs: (Array.isArray(inputs) ? inputs : []).map((item: Manifest, i: number) =>
      convertDataField(item, `${label}.inputs[${i}]`, ctx, INPUT_DATA_TO_CONTENT_TYPE)),
    ...(migratedOutputs.length > 0 ? { outputs: migratedOutputs } : {}),
    ...rest
  };
}

function convertDataField(
  item: Manifest,
  label: string,
  ctx: MigrationContext,
  dataToContentType: Record<string, string>
): Manifest {
  if (!item || typeof item !== 'object' || !('data' in item)) {
    return item;
  }
  const { data, ...rest } = item;
  const contentType = lookup(dataToContentType, data);
  if (!contentType) {
    ctx.problems.push(`${label}: unknown data value "${data}"; replace it with a content-type`);
    return item;
  }
  if (rest['content-type'] === undefined) {
    ctx.changes.push(`${label}: replaced data: ${data} with content-type: ${contentType}`);
    return { name: rest.name, description: rest.description, 'content-type': contentType, ...rest };
  }
  if (rest['content-type'] !== contentType) {
    ctx.problems.push(`${label}: data "${data}" conflicts with content-type "${rest['content-type']}"; keep only the correct one`);
    return item;
  }
  ctx.changes.push(`${label}: removed deprecated data field`);
  return rest;
}

async function ensureValidName(
  name: unknown,
  fieldPath: string,
  label: string,
  schemaVersion: string,
  ctx: MigrationContext
): Promise<unknown> {
  if (typeof name !== 'string' || validateFieldValue(name, fieldPath, 'manifest', schemaVersion) === true) {
    return name;
  }
  if (!ctx.interactive) {
    ctx.problems.push(`${label} "${name}" must start with a lowercase letter in ${schemaVersion}; rename it manually`);
    return name;
  }
  const renamed = await input({
    message: `${label} "${name}" must start with a lowercase letter in ${schemaVersion}. New name:`,
    default: `x-${name}`,
    validate: value => validateFieldValue(value, fieldPath, 'manifest', schemaVersion) === true
      || 'Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens'
  });
  ctx.changes.push(`${label}: renamed "${name}" to "${renamed}"`);
  return renamed;
}

async function resolveCaption(message: string, name: unknown, label: string, ctx: MigrationContext): Promise<string> {
  const inferred = typeof name === 'string' ? humanizeName(name) : '';
  const caption = ctx.interactive
    ? await input({ message, default: inferred, validate: value => (value.trim() ? true : 'Caption is required') })
    : inferred;
  ctx.changes.push(`${label}: added caption "${caption}"`);
  return caption;
}

async function resolveTriggers(
  legacyTrigger: unknown,
  toolName: unknown,
  label: string,
  ctx: MigrationContext
): Promise<ToolTrigger[]> {
  const mapped = lookup(LEGACY_TRIGGER_MAP, legacyTrigger ?? 'AutoRun');
  const inferred: ToolTrigger[] = mapped ? [mapped] : [];

  if (!mapped && !ctx.interactive) {
    ctx.problems.push(`${label}: unknown trigger "${legacyTrigger}"; choose triggers interactively or fix the trigger`);
    return inferred;
  }

  const triggers = ctx.interactive
    ? await checkbox({
      message: `When should tool "${toolName}" run?`,
      choices: TRIGGER_CHOICES.map(choice => ({ ...choice, checked: inferred.includes(choice.value) })),
      validate: choices => (choices.length === 0 ? 'Please select at least one trigger' : true)
    })
    : inferred;

  const source = legacyTrigger === undefined ? 'no trigger (AutoRun default)' : `trigger: ${legacyTrigger}`;
  ctx.changes.push(`${label}: replaced ${source} with triggers: [${triggers.join(', ')}]`);
  return triggers;
}
