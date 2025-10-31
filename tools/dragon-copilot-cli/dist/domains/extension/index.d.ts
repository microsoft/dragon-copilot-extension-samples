import type { Command } from 'commander';
import type { PackageOptions, InitOptions, GenerateOptions } from './types.js';
export * from './types.js';
export * from './shared/prompts.js';
export declare function initProject(options: InitOptions): Promise<void>;
export declare function generateManifest(options: GenerateOptions): Promise<void>;
export declare function validateManifest(file: string): Promise<void>;
export declare function packageExtension(options: PackageOptions): Promise<void>;
export declare function registerExtensionCommands(program: Command): void;
//# sourceMappingURL=index.d.ts.map