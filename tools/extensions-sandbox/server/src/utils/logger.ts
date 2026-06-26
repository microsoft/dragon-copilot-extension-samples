/**
 * Lightweight scoped console logger for the sandbox server.
 *
 * Produces consistently prefixed output so that activity is easy to follow
 * in the terminal during `npm run dev`. Each log line is tagged with the
 * server prefix and a scope (e.g. "manifest", "capabilities", "extension-call").
 */

const PREFIX = '[sandbox-server]';

function timestamp(): string {
  return new Date().toISOString();
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Resolves the active log level from the `LOG_LEVEL` env var.
 * Defaults to `info`; messages below the threshold are suppressed so that
 * normal runs stay readable. Set `LOG_LEVEL=debug` to surface verbose dumps
 * (e.g. request/response bodies and reproducible curl commands).
 */
function resolveLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return 'info';
}

const activeLevel = resolveLevel();

function isEnabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[activeLevel];
}

export interface ScopedLogger {
  /** Whether debug-level output is currently enabled (gate verbose dumps on this). */
  debugEnabled: boolean;
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * Creates a logger bound to a named scope. Example:
 *   const log = createLogger('manifest');
 *   log.info('Validating manifest...');
 *   // => [sandbox-server] [2026-06-25T...] [manifest] Validating manifest...
 *
 * Output is gated by the `LOG_LEVEL` env var (default `info`). Use `log.debug`
 * for verbose output that should be off by default.
 */
export function createLogger(scope: string): ScopedLogger {
  const tag = `${PREFIX} [${scope}]`;
  return {
    debugEnabled: isEnabled('debug'),
    debug: (message: string, ...args: unknown[]) => {
      if (isEnabled('debug')) console.log(`${tag} ${timestamp()} ${message}`, ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      if (isEnabled('info')) console.log(`${tag} ${timestamp()} ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      if (isEnabled('warn')) console.warn(`${tag} ${timestamp()} ⚠ ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      if (isEnabled('error')) console.error(`${tag} ${timestamp()} ✖ ${message}`, ...args);
    },
  };
}
