const esbuild = require('esbuild');
const fs = require('fs-extra');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function bundle() {
	console.log('Bundling CLI into a single CJS file...');

	const bundlePath = path.join(distDir, 'dragon-copilot-bundle.cjs');

	// Read schema JSON files so they can be embedded directly in the bundle.
	// This ensures the SEA standalone binary works without needing schema files on disk.
	const schemasDir = path.join(rootDir, 'src', 'schemas');
	const schemaSources = [
		{ aliases: ['physician/physician-extension-manifest-schema.json', 'physician-extension-manifest-schema.json'], file: path.join('physician', 'physician-extension-manifest-schema.json') },
		{ aliases: ['radiologists/radiologists-extension-manifest-schema.json', 'radiologists-extension-manifest-schema.json'], file: path.join('radiologists', 'radiologists-extension-manifest-schema.json') },
		{ aliases: ['connector-manifest.json'], file: 'connector-manifest.json' },
	];

	const embeddedSchemas = {};
	for (const { aliases, file } of schemaSources) {
		const content = fs.readFileSync(path.join(schemasDir, file), 'utf8');
		for (const alias of aliases) {
			embeddedSchemas[alias] = content;
		}
	}

	const embeddedSchemasBanner = [
		`globalThis.__EMBEDDED_SCHEMAS__ = {`,
		...Object.entries(embeddedSchemas).map(([key, value], index, arr) =>
			`  ${JSON.stringify(key)}: ${value}${index === arr.length - 1 ? '' : ','}`
		),
		`};`
	];

	// Read version from package.json so it's baked into the bundle
	const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

	await esbuild.build({
		entryPoints: [path.join(distDir, 'cli.js')],
		bundle: true,
		platform: 'node',
		target: 'node20',
		format: 'cjs',
		outfile: bundlePath,
		define: {
			__CLI_VERSION__: JSON.stringify(pkg.version),
		},
		banner: {
			js: [
				'#!/usr/bin/env node',
				...embeddedSchemasBanner
			].join('\n')
		},
		// Keep native Node.js modules external
		external: [],
		// Resolve .js imports that actually point to compiled TS files
		resolveExtensions: ['.js', '.mjs', '.cjs', '.json'],
		// Ensure JSON files imported via require/import are included
		loader: { '.json': 'json' },
		logLevel: 'info',
	});

	// Post-process: strip any duplicate shebangs that esbuild may have preserved
	// from the source entry, leaving only the one from our banner.
	let content = fs.readFileSync(bundlePath, 'utf8');
	const lines = content.split('\n');
	// Remove all shebang lines except the very first one
	const cleaned = lines.filter((line, i) => i === 0 || !line.startsWith('#!'));
	fs.writeFileSync(bundlePath, cleaned.join('\n'));

	console.log('Bundle created: dist/dragon-copilot-bundle.cjs');
}

bundle().catch((err) => {
	console.error('Bundle failed:', err);
	process.exit(1);
});
