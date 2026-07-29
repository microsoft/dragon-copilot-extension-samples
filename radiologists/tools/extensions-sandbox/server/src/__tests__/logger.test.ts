import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The logger resolves `LOG_LEVEL` / `LOG_FORMAT` / `NODE_ENV` once at module
 * load, so each test sets the desired env, resets the module registry, and
 * dynamically re-imports a fresh copy.
 */
async function loadLogger(env: Record<string, string | undefined>) {
  for (const key of ['LOG_LEVEL', 'LOG_FORMAT', 'NODE_ENV']) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  return import('../utils/logger.js');
}

describe('logger', () => {
  const ORIGINAL_ENV = { ...process.env };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    process.env = { ...ORIGINAL_ENV };
  });

  describe('JSON format', () => {
    it('emits a structured JSON object per line', async () => {
      const { createLogger } = await loadLogger({ LOG_FORMAT: 'json' });
      createLogger('manifest').info('Validating manifest');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const line = logSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(line);
      expect(parsed).toMatchObject({
        level: 'info',
        scope: 'manifest',
        msg: 'Validating manifest',
      });
      expect(typeof parsed.time).toBe('string');
      expect(parsed.args).toBeUndefined();
    });

    it('includes extra args under "args" and expands Error objects', async () => {
      const { createLogger } = await loadLogger({ LOG_FORMAT: 'json' });
      createLogger('server').error('Unhandled error', new Error('boom'));

      const line = errorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(line);
      expect(parsed.level).toBe('error');
      expect(parsed.args[0]).toMatchObject({ name: 'Error', message: 'boom' });
      expect(typeof parsed.args[0].stack).toBe('string');
    });

    it('routes warn/error through the matching console methods', async () => {
      const { createLogger } = await loadLogger({ LOG_FORMAT: 'json' });
      const log = createLogger('http');
      log.warn('careful');
      log.error('broken');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(warnSpy.mock.calls[0][0] as string).level).toBe('warn');
      expect(JSON.parse(errorSpy.mock.calls[0][0] as string).level).toBe('error');
    });

    it('serializes non-serializable args without throwing', async () => {
      const { createLogger } = await loadLogger({ LOG_FORMAT: 'json' });
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(() =>
        createLogger('server').info('with circular', circular, 10n, () => {}),
      ).not.toThrow();

      const line = logSpy.mock.calls[0][0] as string;
      // The whole line must remain valid JSON despite the unserializable args.
      const parsed = JSON.parse(line);
      expect(parsed.msg).toBe('with circular');
      // Circular ref keeps its structure (cycle marked), BigInt and function
      // fall back to their string form.
      expect(parsed.args).toEqual([{ self: '[Circular]' }, '10', expect.any(String)]);
    });
  });

  describe('pretty format', () => {
    it('emits a prefixed, human-readable line with scope and message', async () => {
      const { createLogger } = await loadLogger({ LOG_FORMAT: 'pretty' });
      createLogger('auth').info('Acquiring token');

      const line = logSpy.mock.calls[0][0] as string;
      expect(line).toContain('[sandbox-server] [auth]');
      expect(line).toContain('Acquiring token');
      // Pretty lines are not valid JSON.
      expect(() => JSON.parse(line)).toThrow();
    });
  });

  describe('LOG_FORMAT defaulting', () => {
    it('defaults to json when NODE_ENV=production', async () => {
      const { createLogger } = await loadLogger({ NODE_ENV: 'production' });
      createLogger('server').info('up');
      expect(() => JSON.parse(logSpy.mock.calls[0][0] as string)).not.toThrow();
    });

    it('defaults to pretty in development', async () => {
      const { createLogger } = await loadLogger({ NODE_ENV: 'development' });
      createLogger('server').info('up');
      expect(logSpy.mock.calls[0][0] as string).toContain('[sandbox-server]');
    });
  });

  describe('LOG_LEVEL gating', () => {
    it('suppresses messages below the active level', async () => {
      const { createLogger } = await loadLogger({ LOG_LEVEL: 'warn', LOG_FORMAT: 'json' });
      const log = createLogger('validation');
      log.debug('noisy');
      log.info('routine');
      log.warn('attention');
      // debug + info suppressed; only warn emitted.
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('exposes debugEnabled reflecting the active level', async () => {
      const { createLogger: makeDebug } = await loadLogger({ LOG_LEVEL: 'debug' });
      expect(makeDebug('x').debugEnabled).toBe(true);
      const { createLogger: makeInfo } = await loadLogger({ LOG_LEVEL: 'info' });
      expect(makeInfo('x').debugEnabled).toBe(false);
    });
  });
});
