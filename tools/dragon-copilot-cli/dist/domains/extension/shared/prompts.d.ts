import type { DragonExtensionManifest, PublisherConfig, AutomationScript, EventTrigger, Dependency } from '../types.js';
export interface ExtensionDetails {
    name: string;
    description: string;
    version: string;
}
export interface ToolDetails {
    toolName: string;
    toolDescription: string;
    endpoint: string;
    inputTypes: string[];
    outputs: OutputDetails[];
}
export interface OutputDetails {
    name: string;
    description: string;
    data: string;
}
export interface AutomationScriptDetails {
    name: string;
    description?: string;
    entryPoint: string;
    runtime: string;
    timeoutSeconds?: number;
}
export interface EventTriggerDetails {
    name: string;
    description?: string;
    eventType: string;
    conditions?: string[];
    scriptName: string;
}
export interface DependencyDetails {
    name: string;
    version: string;
    type?: 'extension' | 'service' | 'package';
}
export declare const INPUT_TYPE_CHOICES: {
    name: string;
    value: string;
}[];
/**
 * Validates tool name input
 */
export declare function validateToolName(input: string, existingManifest?: DragonExtensionManifest | null): string | boolean;
export declare function validateAutomationScriptName(input: string, existingScripts?: AutomationScript[]): string | boolean;
export declare function validateEventTriggerName(input: string, existingTriggers?: EventTrigger[]): string | boolean;
export declare function validateDependencyVersion(input: string): string | boolean;
/**
 * Validates extension name input using schema validation
 */
export declare function validateExtensionName(input: string): string | boolean;
/**
 * Validates URL input using schema validation
 */
export declare function validateUrl(input: string): string | boolean;
/**
 * Validates version format using schema validation
 */
export declare function validateVersion(input: string): string | boolean;
/**
 * Validates publisher ID input using schema validation
 */
export declare function validatePublisherId(input: string): string | boolean;
/**
 * Validates email input using schema validation
 */
export declare function validateEmail(input: string): string | boolean;
/**
 * Validates tenant ID input (GUID format)
 */
export declare function validateTenantId(input: string): string | boolean;
/**
 * Prompts for extension details
 */
export declare function promptExtensionDetails(defaults?: Partial<ExtensionDetails>): Promise<ExtensionDetails>;
/**
 * Prompts for authentication details
 */
export declare function promptAuthDetails(defaults?: {
    tenantId?: string;
}): Promise<{
    tenantId: string;
}>;
/**
 * Prompts for tool details with configurable options
 */
export declare function promptToolDetails(existingManifest?: DragonExtensionManifest | null, options?: {
    allowMultipleInputs?: boolean;
    defaults?: {
        toolName?: string;
        toolDescription?: string;
        endpoint?: string;
    };
}): Promise<ToolDetails>;
/**
 * Gets description for a given data type
 */
export declare function getInputDescription(dataType: string): string;
/**
 * Prompts for output details
 */
export declare function promptOutputDetails(defaults?: {
    name?: string;
    description?: string;
}): Promise<OutputDetails>;
/**
 * Prompts for multiple outputs
 */
export declare function promptOutputs(): Promise<OutputDetails[]>;
export declare function promptAutomationScriptDetails(existingScripts: AutomationScript[]): Promise<AutomationScriptDetails>;
export declare function promptEventTriggerDetails(existingTriggers: EventTrigger[], availableScripts: AutomationScript[]): Promise<EventTriggerDetails>;
export declare function promptDependencyDetails(existingDependencies: Dependency[]): Promise<DependencyDetails>;
export declare function promptPublisherDetails(defaults?: Partial<PublisherConfig>): Promise<PublisherConfig>;
//# sourceMappingURL=prompts.d.ts.map