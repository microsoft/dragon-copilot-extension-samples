/**
 * Pure manifest core for Dragon Copilot (radiologists) extensions.
 *
 * Everything exported here is free of prompts, filesystem access, and
 * `process.exit`, so it can run inside the CLI, inside a server request
 * handler, or inside a test. The Extensions Sandbox syncs this folder in
 * verbatim to power its "Dragon Copilot CLI" manifest wizard — see
 * `radiologists/tools/extensions-sandbox/server/scripts/sync-schemas.ts`.
 *
 * Only `js-yaml` may be imported from here; adding a CLI-only dependency
 * (chalk, @inquirer/prompts, fs-extra, …) would break the sandbox build.
 *
 * Language level: this folder is compiled twice — by the CLI (`lib: ["es2020"]`)
 * and by the sandbox server (ES2022). Stick to ES2020 APIs, or the CLI build
 * fails while the sandbox build stays green.
 */
export * from './types.js';
export * from './choices.js';
export * from './templates.js';
export * from './builder.js';
