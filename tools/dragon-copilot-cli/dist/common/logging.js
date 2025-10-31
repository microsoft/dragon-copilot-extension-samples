/**
 * Writes a message to stdout unless running silently or in tests.
 */
export function logMessage(message, options) {
    const silent = typeof options === 'boolean' ? options : options?.silent ?? false;
    if (silent) {
        return;
    }
    const nodeEnv = globalThis.process?.env?.NODE_ENV;
    if (nodeEnv === 'test') {
        return;
    }
    console.log(message);
}
//# sourceMappingURL=logging.js.map