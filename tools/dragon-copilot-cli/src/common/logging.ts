export type LogOptions = {
	silent?: boolean;
};

/**
 * Writes a message to stdout unless running silently or in tests.
 */
export function logMessage(message: string, options?: LogOptions | boolean): void {
	const silent = typeof options === 'boolean' ? options : options?.silent ?? false;

	if (silent) {
		return;
	}

	const nodeEnv = (globalThis as typeof globalThis & {
		process?: {
			env?: Record<string, string | undefined>;
		};
	}).process?.env?.NODE_ENV;

	if (nodeEnv === 'test') {
		return;
	}

	console.log(message);
}
