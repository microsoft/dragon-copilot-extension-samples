import chalk from 'chalk';
import { getSchemaVersions, LEGACY_SCHEMA_VERSION } from '../shared/schema-validator.js';

export async function listSchemaVersions(): Promise<void> {
  console.log(chalk.blue('🐉 Supported physician manifest schema versions\n'));

  for (const info of getSchemaVersions()) {
    const tags = [
      info.latest ? 'latest, default' : '',
      info.preview ? 'preview' : '',
      info.deprecated ? 'deprecated' : ''
    ].filter(Boolean);
    const label = info.version === LEGACY_SCHEMA_VERSION
      ? `${info.version} (original format, no schemaVersion field)`
      : info.version;
    const suffix = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
    console.log(`  ${info.latest ? chalk.green(label) : label}${chalk.gray(suffix)}`);
  }

  console.log(chalk.gray('\nUse --schema-version <version> with init or generate to target a specific version.'));
}
