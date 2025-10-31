export type LogOptions = {
    silent?: boolean;
};
/**
 * Writes a message to stdout unless running silently or in tests.
 */
export declare function logMessage(message: string, options?: LogOptions | boolean): void;
//# sourceMappingURL=logging.d.ts.map