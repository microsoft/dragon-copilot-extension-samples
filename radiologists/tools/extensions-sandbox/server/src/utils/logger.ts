/**
 * Lightweight scoped logger for the sandbox server.
 *
 * Supports two output formats, selected automatically per environment and
 * overridable via the `LOG_FORMAT` env var:
 *
 *  - `pretty` (default in development): consistently prefixed, human-readable
 *    lines that are easy to follow in the terminal during `npm run dev`, e.g.
 *    `[sandbox-server] [manifest] 2026-06-25T... Validating manifest...`
 *  - `json` (default in production): one structured JSON object per line,
 *    suitable for machine parsing / log aggregation, e.g.
 *    `{"time":"2026-06-25T...","level":"info","scope":"manifest","msg":"..."}`
 *
 * Each log line is tagged with a scope (e.g. "manifest", "extension-call",
 * "auth"). Output is gated by the `LOG_LEVEL` env var (default `info`).
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

export type LogFormat = 'pretty' | 'json';

/**
 * Resolves the output format from the `LOG_FORMAT` env var, falling back to a
 * per-environment default: `json` in production (`NODE_ENV=production`) so logs
 * are machine-parseable, `pretty` otherwise so local dev stays readable.
 */
function resolveFormat(): LogFormat {
  const raw = (process.env.LOG_FORMAT || '').trim().toLowerCase();
  if (raw === 'json' || raw === 'pretty') {
    return raw;
  }
  return (process.env.NODE_ENV || '').trim().toLowerCase() === 'production'
    ? 'json'
    : 'pretty';
}

const activeLevel = resolveLevel();
const activeFormat = resolveFormat();

function isEnabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[activeLevel];
}

/**
 * JSON replacer that keeps a single `JSON.stringify` pass safe against values
 * that would otherwise throw or be silently dropped. A fresh `seen` set is
 * created per call so cycles are detected without leaking state between lines:
 *  - `Error` is expanded to `{ name, message, stack }` (its default JSON form
 *    is an empty `{}`);
 *  - `bigint` / `function` / `symbol` are stringified (otherwise they throw or
 *    serialize to `null`);
 *  - circular references are replaced with `'[Circular]'` instead of throwing.
 *
 * Note: a non-circular object referenced more than once is also rendered as
 * `'[Circular]'` on its repeat occurrence — the standard trade-off for a
 * WeakSet-based detector, and acceptable for diagnostic log output.
 */
function makeSafeReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet<object>();
  return (_key, value) => {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    const type = typeof value;
    if (type === 'bigint' || type === 'function' || type === 'symbol') {
      return (value as { toString(): string }).toString();
    }
    if (type === 'object' && value !== null) {
      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);
    }
    return value;
  };
}

export interface ScopedLogger {
  /** Whether debug-level output is currently enabled (gate verbose dumps on this). */
  debugEnabled: boolean;
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

type ConsoleMethod = (...args: unknown[]) => void;

/**
 * Creates a logger bound to a named scope. Example:
 *   const log = createLogger('manifest');
 *   log.info('Validating manifest...');
 *   // pretty => [sandbox-server] [manifest] 2026-06-25T... Validating manifest...
 *   // json   => {"time":"2026-06-25T...","level":"info","scope":"manifest","msg":"Validating manifest..."}
 *
 * Output is gated by the `LOG_LEVEL` env var (default `info`) and formatted per
 * the `LOG_FORMAT` env var (default `pretty` in dev, `json` in production). Use
 * `log.debug` for verbose output that should be off by default.
 */
export function createLogger(scope: string): ScopedLogger {
  const tag = `${PREFIX} [${scope}]`;

  function emit(
    level: LogLevel,
    sink: ConsoleMethod,
    prettyMarker: string,
    message: string,
    args: unknown[],
  ): void {
    if (!isEnabled(level)) return;
    if (activeFormat === 'json') {
      const entry: Record<string, unknown> = {
        time: timestamp(),
        level,
        scope,
        msg: message,
      };
      if (args.length > 0) {
        entry.args = args;
      }
      // A single stringify pass; the replacer keeps it safe against Errors,
      // BigInt/functions, and circular references (see makeSafeReplacer).
      sink(JSON.stringify(entry, makeSafeReplacer()));
      return;
    }
    const prefix = prettyMarker
      ? `${tag} ${timestamp()} ${prettyMarker} `
      : `${tag} ${timestamp()} `;
    sink(`${prefix}${message}`, ...args);
  }

  return {
    debugEnabled: isEnabled('debug'),
    debug: (message: string, ...args: unknown[]) =>
      emit('debug', console.log, '', message, args),
    info: (message: string, ...args: unknown[]) =>
      emit('info', console.log, '', message, args),
    warn: (message: string, ...args: unknown[]) =>
      emit('warn', console.warn, '⚠', message, args),
    error: (message: string, ...args: unknown[]) =>
      emit('error', console.error, '✖', message, args),
  };
}
