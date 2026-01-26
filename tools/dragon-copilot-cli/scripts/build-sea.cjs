/**
 * Build script for creating a Node.js Single Executable Application (SEA)
 * 
 * This script:
 * 1. Bundles TypeScript/ESM to a single CommonJS file using esbuild
 * 2. Embeds assets (schemas, resources) into the bundle
 * 3. Generates the SEA preparation blob
 * 4. Creates the final executable
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SEA_DIR = path.join(DIST_DIR, 'sea');
const BUNDLE_FILE = path.join(SEA_DIR, 'bundle.cjs');
const SEA_CONFIG = path.join(SEA_DIR, 'sea-config.json');
const SEA_BLOB = path.join(SEA_DIR, 'sea-prep.blob');

// Determine platform-specific executable name
const isWindows = process.platform === 'win32';
const EXE_NAME = isWindows ? 'dragon-copilot.exe' : 'dragon-copilot';
const OUTPUT_EXE = path.join(DIST_DIR, 'bin', EXE_NAME);

async function main() {
	console.log('🔨 Building Dragon Copilot CLI Single Executable...\n');

	// Step 1: Clean and prepare directories
	console.log('📁 Preparing build directories...');
	fs.removeSync(SEA_DIR);
	fs.ensureDirSync(SEA_DIR);
	fs.ensureDirSync(path.join(DIST_DIR, 'bin'));

	// Step 2: Bundle with esbuild
	console.log('📦 Bundling TypeScript with esbuild...');
	try {
		execSync(
			`npx esbuild src/cli.ts --bundle --platform=node --target=node20 --format=cjs --outfile="${BUNDLE_FILE}" --external:fsevents`,
			{ cwd: ROOT_DIR, stdio: 'inherit' }
		);
	} catch (error) {
		console.error('❌ esbuild bundling failed:', error.message);
		process.exit(1);
	}

	// Step 3: Inject asset loading shim for schemas and resources
	console.log('🔧 Injecting asset loading shim...');
	let bundleContent = fs.readFileSync(BUNDLE_FILE, 'utf-8');
	
	// Remove shebang if present (causes syntax errors in SEA)
	bundleContent = bundleContent.replace(/^#!.*\n/, '');
	
	// Read and embed schemas
	const schemasDir = path.join(ROOT_DIR, 'src', 'schemas');
	const schemas = {};
	if (fs.existsSync(schemasDir)) {
		for (const file of fs.readdirSync(schemasDir)) {
			if (file.endsWith('.json')) {
				const content = fs.readFileSync(path.join(schemasDir, file), 'utf-8');
				schemas[file] = JSON.parse(content);
			}
		}
	}

	// Read and embed resources (binary files as base64)
	const resourcesDir = path.join(ROOT_DIR, 'src', 'resources');
	const resources = {};
	function readResourcesRecursively(dir, basePath = '') {
		if (!fs.existsSync(dir)) return;
		for (const item of fs.readdirSync(dir)) {
			const fullPath = path.join(dir, item);
			const relativePath = path.join(basePath, item);
			if (fs.statSync(fullPath).isDirectory()) {
				readResourcesRecursively(fullPath, relativePath);
			} else {
				const content = fs.readFileSync(fullPath);
				resources[relativePath.replace(/\\/g, '/')] = content.toString('base64');
			}
		}
	}
	readResourcesRecursively(resourcesDir);

	// Create the SEA-aware wrapper
	const seaWrapper = `
// ============================================
// Dragon Copilot CLI - SEA Embedded Assets
// ============================================

// Embedded schemas (JSON)
const __EMBEDDED_SCHEMAS__ = ${JSON.stringify(schemas, null, 2)};

// Embedded resources (base64 encoded)
const __EMBEDDED_RESOURCES__ = ${JSON.stringify(resources, null, 2)};

// Check if running as SEA
const isSEA = (() => {
	try {
		return require('node:sea').isSea();
	} catch {
		return false;
	}
})();

// Override fs.readFileSync for embedded assets when running as SEA
if (isSEA) {
	const originalReadFileSync = require('fs').readFileSync;
	const path = require('path');
	
	require('fs').readFileSync = function(filePath, options) {
		const normalizedPath = path.normalize(String(filePath));
		
		// Check if this is a request for an embedded schema
		for (const [schemaName, schemaContent] of Object.entries(__EMBEDDED_SCHEMAS__)) {
			if (normalizedPath.includes('schemas') && normalizedPath.endsWith(schemaName)) {
				const content = JSON.stringify(schemaContent);
				if (options === 'utf-8' || options === 'utf8' || options?.encoding === 'utf-8' || options?.encoding === 'utf8') {
					return content;
				}
				return Buffer.from(content);
			}
		}
		
		// Check if this is a request for an embedded resource
		for (const [resourcePath, base64Content] of Object.entries(__EMBEDDED_RESOURCES__)) {
			if (normalizedPath.includes('resources') && normalizedPath.includes(resourcePath.replace(/\\//g, path.sep))) {
				const buffer = Buffer.from(base64Content, 'base64');
				if (options === 'utf-8' || options === 'utf8' || options?.encoding === 'utf-8' || options?.encoding === 'utf8') {
					return buffer.toString('utf-8');
				}
				return buffer;
			}
		}
		
		// Fall back to original implementation
		return originalReadFileSync.apply(this, arguments);
	};
}

// ============================================
// Original bundled code below
// ============================================

`;

	fs.writeFileSync(BUNDLE_FILE, seaWrapper + bundleContent);
	console.log(`   ✓ Embedded ${Object.keys(schemas).length} schemas`);
	console.log(`   ✓ Embedded ${Object.keys(resources).length} resources`);

	// Step 4: Create SEA configuration
	console.log('⚙️  Creating SEA configuration...');
	const seaConfig = {
		main: BUNDLE_FILE,
		output: SEA_BLOB,
		disableExperimentalSEAWarning: true,
		useCodeCache: false  // Disable code cache to avoid syntax issues
	};
	fs.writeFileSync(SEA_CONFIG, JSON.stringify(seaConfig, null, 2));

	// Step 5: Generate SEA preparation blob
	console.log('🔧 Generating SEA preparation blob...');
	try {
		execSync(`node --experimental-sea-config "${SEA_CONFIG}"`, {
			cwd: ROOT_DIR,
			stdio: 'inherit'
		});
	} catch (error) {
		console.error('❌ SEA blob generation failed:', error.message);
		process.exit(1);
	}

	// Step 6: Copy Node.js binary
	console.log('📋 Copying Node.js binary...');
	const nodePath = process.execPath;
	fs.copyFileSync(nodePath, OUTPUT_EXE);

	// Step 7: Remove signature (Windows/macOS)
	if (process.platform === 'darwin') {
		console.log('🔐 Removing macOS signature...');
		try {
			execSync(`codesign --remove-signature "${OUTPUT_EXE}"`, { stdio: 'inherit' });
		} catch (error) {
			console.warn('⚠️  Could not remove signature (may not be signed)');
		}
	} else if (isWindows) {
		console.log('🔐 Note: Windows signature removal is optional');
		// signtool remove /s is optional on Windows
	}

	// Step 8: Inject the blob using postject
	console.log('💉 Injecting SEA blob into executable...');
	const sentinelFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
	
	let postjectCmd;
	if (process.platform === 'darwin') {
		postjectCmd = `npx postject "${OUTPUT_EXE}" NODE_SEA_BLOB "${SEA_BLOB}" --sentinel-fuse ${sentinelFuse} --macho-segment-name NODE_SEA`;
	} else {
		postjectCmd = `npx postject "${OUTPUT_EXE}" NODE_SEA_BLOB "${SEA_BLOB}" --sentinel-fuse ${sentinelFuse}`;
	}

	try {
		execSync(postjectCmd, { cwd: ROOT_DIR, stdio: 'inherit' });
	} catch (error) {
		console.error('❌ Blob injection failed:', error.message);
		console.log('   Make sure postject is installed: npm install -g postject');
		process.exit(1);
	}

	// Step 9: Re-sign (macOS)
	if (process.platform === 'darwin') {
		console.log('🔐 Re-signing macOS executable...');
		try {
			execSync(`codesign --sign - "${OUTPUT_EXE}"`, { stdio: 'inherit' });
		} catch (error) {
			console.warn('⚠️  Could not sign executable');
		}
	}

	// Step 10: Get file size
	const stats = fs.statSync(OUTPUT_EXE);
	const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

	console.log('\n✅ Build complete!');
	console.log(`   📦 Output: ${OUTPUT_EXE}`);
	console.log(`   📏 Size: ${sizeMB} MB`);
	console.log(`\n   Run with: ${isWindows ? '.\\dist\\bin\\dragon-copilot.exe' : './dist/bin/dragon-copilot'}`);
}

main().catch(error => {
	console.error('Build failed:', error);
	process.exit(1);
});
