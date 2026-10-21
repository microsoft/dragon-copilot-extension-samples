import fs from 'fs-extra';
const { readFileSync, writeFileSync } = fs;
import path from 'path';
import { load, dump } from 'js-yaml';
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
import { TRIGGER_CHOICES, humanizeName } from '../shared/prompts.js';

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

// Ordered oldest to newest; each step upgrades exactly one version so they can be chained.
const MIGRATION_STEPS: MigrationStep[] = [
  { from: LEGACY_SCHEMA_VERSION, to: '0.3.0', apply: migrateLegacyTo030 }
];

const MIGRATION_ORDER = [LEGACY_SCHEMA_VERSION, ...MIGRATION_STEPS.map(step => step.to)];

const DATA_TO_CONTENT_TYPE: Record<string, string> = {
  'DSP/Note': 'application/vnd.ms-dragon.dsp.note+json',
  'DSP/Transcript': 'application/vnd.ms-dragon.dsp.transcript+json',
  'DSP/IterativeAudio': 'application/vnd.ms-dragon.dsp.iterative-audio+json',
  'DSP/IterativeTranscript': 'application/vnd.ms-dragon.dsp.iterative-transcript+json'
};

const OUTPUT_CONTENT_TYPE = 'application/vnd.ms-dragon.dsp+json';

const LEGACY_TRIGGER_MAP: Record<string, ToolTrigger> = {
  AutoRun: 'DataAvailable',
  AdaptiveCardAction: 'ExplicitRequest'
};

export async function migrateManifest(filePath: string, options: MigrateOptions): Promise<void> {
  console.log(chalk.blue('🐉 Migrating Dragon Copilot Physician Workflow Manifest'));
  console.log(chalk.gray(`📄 File: ${filePath}\n`));

  try {
    const manifest = load(readFileSync(filePath, 'utf8')) as Manifest;
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Manifest is empty or not a YAML object');
    }

    const fromVersion = getManifestSchemaVersion(manifest);
    if (!isSupportedSchemaVersion(fromVersion)) {
      throw new Error(`Manifest uses unsupported schemaVersion "${fromVersion}"`);
    }
    const toVersion = resolveRequestedSchemaVersion(options.to);

    const fromIndex = MIGRATION_ORDER.indexOf(fromVersion);
    const toIndex = MIGRATION_ORDER.indexOf(toVersion);
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

    const yamlContent = dump(migrated, { lineWidth: -1 });
    const result = validateExtensionManifest(migrated);

    if (options.dryRun) {
      console.log(chalk.blue('\n📄 Migrated manifest (dry run, nothing written):\n'));
      console.log(yamlContent);
    }

    if (!result.isValid) {
      console.log(chalk.red(`\n❌ The migrated manifest does not pass ${toVersion} validation:`));
      result.errors.forEach((error: SchemaError) => {
        const fieldName = error.instancePath.replace(/^\//, '').replace(/\//g, '.') || 'manifest';
        console.log(chalk.red(`  • ${fieldName}: ${error.message}`));
      });
      console.log(chalk.yellow('\nFix the issues above in the original manifest and rerun migrate.'));
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

  const migratedName = await ensureValidName(name, 'name', 'Extension name', ctx);
  const caption = await resolveCaption('Extension caption (display name):', migratedName, 'caption', ctx);

  const migratedTools = [];
  for (const [index, tool] of (Array.isArray(tools) ? tools : []).entries()) {
    migratedTools.push(await migrateToolTo030(tool ?? {}, index, ctx));
  }

  ctx.changes.unshift('Added schemaVersion: 0.3.0');

  return {
    schemaVersion: '0.3.0',
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
  const { name, description, trigger, endpoint, inputs, outputs, ...rest } = tool;
  const label = `tools[${index}]`;

  const migratedName = await ensureValidName(name, 'definitions.Tool.properties.name', `Tool name for ${label}`, ctx);
  const caption = await resolveCaption(`Caption for tool "${migratedName}":`, migratedName, `${label}.caption`, ctx);

  ctx.changes.push(`${label}: added type: DragonAPI`);
  const triggers = await resolveTriggers(trigger, migratedName, label, ctx);

  return {
    name: migratedName,
    caption,
    description,
    type: 'DragonAPI',
    triggers,
    endpoint,
    inputs: (Array.isArray(inputs) ? inputs : []).map((item: Manifest, i: number) =>
      convertDataField(item, `${label}.inputs[${i}]`, ctx, value => DATA_TO_CONTENT_TYPE[value])),
    outputs: (Array.isArray(outputs) ? outputs : []).map((item: Manifest, i: number) =>
      convertDataField(item, `${label}.outputs[${i}]`, ctx, () => OUTPUT_CONTENT_TYPE)),
    ...rest
  };
}

function convertDataField(
  item: Manifest,
  label: string,
  ctx: MigrationContext,
  mapData: (value: string) => string | undefined
): Manifest {
  if (!item || typeof item !== 'object' || !('data' in item)) {
    return item;
  }
  const { data, ...rest } = item;
  const contentType = mapData(String(data));
  if (!contentType) {
    ctx.problems.push(`${label}: unknown data value "${data}"; set content-type manually`);
    return item;
  }
  if (rest['content-type'] === undefined) {
    ctx.changes.push(`${label}: replaced data: ${data} with content-type: ${contentType}`);
    return { name: rest.name, description: rest.description, 'content-type': contentType, ...rest };
  }
  ctx.changes.push(`${label}: removed deprecated data field`);
  return rest;
}

async function ensureValidName(
  name: unknown,
  fieldPath: string,
  label: string,
  ctx: MigrationContext
): Promise<unknown> {
  if (typeof name !== 'string' || validateFieldValue(name, fieldPath, 'manifest', '0.3.0') === true) {
    return name;
  }
  if (!ctx.interactive) {
    ctx.problems.push(`${label} "${name}" must start with a lowercase letter in 0.3.0; rename it manually`);
    return name;
  }
  const renamed = await input({
    message: `${label} "${name}" must start with a lowercase letter in 0.3.0. New name:`,
    default: `x-${name}`,
    validate: value => validateFieldValue(value, fieldPath, 'manifest', '0.3.0') === true
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
  if (legacyTrigger !== undefined && typeof legacyTrigger === 'string' && !(legacyTrigger in LEGACY_TRIGGER_MAP)) {
    ctx.problems.push(`${label}: unknown trigger "${legacyTrigger}"; defaulted to DataAvailable`);
  }
  const inferred: ToolTrigger[] = [LEGACY_TRIGGER_MAP[String(legacyTrigger ?? 'AutoRun')] ?? 'DataAvailable'];

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
