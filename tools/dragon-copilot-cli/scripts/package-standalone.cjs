const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const rootDir = path.resolve(__dirname, '..');
const blobPath = path.join(rootDir, 'dist', 'dragon-copilot.blob');
const outputDir = path.join(rootDir, 'standalone');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

async function packageStandalone() {
  const bundlePath = path.join(rootDir, 'dist', 'dragon-copilot-bundle.cjs');
  if (!fs.existsSync(bundlePath)) {
    console.error('Bundle not found. Run "npm run bundle" first.');
    process.exit(1);
  }

  // Step 1: Generate the blob
  console.log('Generating SEA blob...');
  run('node --experimental-sea-config sea-config.json');

  if (!fs.existsSync(blobPath)) {
    console.error('Failed to generate SEA blob.');
    process.exit(1);
  }

  // Step 2: Create output directory
  fs.ensureDirSync(outputDir);

  // Step 3: Copy node binary
  const nodePath = process.execPath;
  const outputName = isWindows ? 'dragon-copilot.exe' : 'dragon-copilot';
  const outputPath = path.join(outputDir, outputName);

  console.log(`Copying Node.js binary to ${outputName}...`);
  fs.copyFileSync(nodePath, outputPath);

  // Step 4: Remove signature on macOS
  if (isMac) {
    console.log('Removing macOS code signature...');
    run(`codesign --remove-signature "${outputPath}"`);
  }

  // Step 5: Inject the blob
  console.log('Injecting SEA blob...');
  const sentinelFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
  run(`npx postject "${outputPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse ${sentinelFuse}${isMac ? ' --macho-segment-name NODE_SEA' : ''}`);

  // Step 6: Re-sign on macOS
  if (isMac) {
    console.log('Re-signing macOS binary...');
    run(`codesign --sign - "${outputPath}"`);
  }

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Standalone binary created: ${outputPath} (${sizeMB} MB)`);
}

packageStandalone().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
