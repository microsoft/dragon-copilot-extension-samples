import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const distCli = join(projectRoot, 'dist', 'cli.js');

function log(message) {
  console.log(message);
}

function parseArgs(argv) {
  const result = { cwd: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cwd' || arg === '--path') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error(`Expected a directory after ${arg}`);
      }
      result.cwd = resolve(process.cwd(), next);
      i += 1;
    } else if (arg.startsWith('--cwd=') || arg.startsWith('--path=')) {
      const [, value] = arg.split('=');
      result.cwd = resolve(process.cwd(), value);
    }
  }
  return result;
}

function runCommand(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
    child.on('error', rejectPromise);
  });
}

async function main() {
  const { cwd } = parseArgs(process.argv.slice(2));

  if (!existsSync(distCli)) {
    log('❌ CLI build not found. Run "npm run build" first.');
    process.exitCode = 1;
    return;
  }

  const integrationPath = join(cwd, 'integration.yaml');
  const publisherPath = join(cwd, 'publisher.json');

  if (!existsSync(integrationPath)) {
    log(`❌ Missing integration manifest: ${integrationPath}`);
    process.exitCode = 1;
    return;
  }

  if (!existsSync(publisherPath)) {
    log(`❌ Missing publisher configuration: ${publisherPath}`);
    process.exitCode = 1;
    return;
  }

  log('🔎 Validating manifest...');
  await runCommand('node', [distCli, 'validate', 'integration.yaml'], { cwd });

  log('📦 Packaging integration...');
  await runCommand('node', [distCli, 'package'], { cwd });

  let manifestName = 'partner-integration';
  let manifestVersion = '0.0.1';
  try {
    const parsed = yaml.load(readFileSync(integrationPath, 'utf8')) ?? {};
    if (typeof parsed === 'object' && parsed) {
      if (typeof parsed.name === 'string' && parsed.name.trim()) {
        manifestName = parsed.name.trim();
      }
      if (typeof parsed.version === 'string' && parsed.version.trim()) {
        manifestVersion = parsed.version.trim();
      }
    }
  } catch {
    // Fallback to defaults if parsing fails
  }

  const zipName = `${manifestName}-${manifestVersion}.zip`;
  log('✅ Validation and packaging complete.');
  log(`📁 Upload ${join(cwd, zipName)}`);
}

main().catch(error => {
  console.error('❌ Failed to validate and package integration.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
