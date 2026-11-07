import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const BACKEND_DIR = resolve(import.meta.dirname, '..');
const DEFAULT_STATIC_DIR = resolve(BACKEND_DIR, '../frontend/dist');

/** Pretends the built frontend exists (or not) without touching the disk. */
const withFrontendBuilt = (built: boolean) => ({ exists: () => built });

describe('loadConfig', () => {
  it('uses safe defaults when nothing is set', () => {
    expect(loadConfig({}, withFrontendBuilt(false))).toEqual({
      port: 3000,
      dbPath: join(BACKEND_DIR, 'data', 'hr.db'),
      seed: 42,
      count: 10_000,
      staticDir: undefined,
    });
  });

  it('reads PORT, DB_PATH, SEED and COUNT from the environment', () => {
    const config = loadConfig(
      { PORT: '8080', DB_PATH: '/var/data/hr.db', SEED: '7', COUNT: '500' },
      withFrontendBuilt(false),
    );

    expect(config).toMatchObject({ port: 8080, dbPath: '/var/data/hr.db', seed: 7, count: 500 });
  });

  it('serves the built frontend when it exists', () => {
    expect(loadConfig({}, withFrontendBuilt(true)).staticDir).toBe(DEFAULT_STATIC_DIR);
  });

  it('serves the frontend from STATIC_DIR when set', () => {
    expect(loadConfig({ STATIC_DIR: '/srv/web' }, withFrontendBuilt(true)).staticDir).toBe(
      '/srv/web',
    );
  });

  it.each([
    [{ PORT: 'abc' }, /PORT/],
    [{ PORT: '70000' }, /PORT/],
    [{ COUNT: '0' }, /COUNT/],
    [{ COUNT: '1000001' }, /COUNT/],
    [{ SEED: '1.5' }, /SEED/],
  ])('rejects an invalid value: %o', (env, message) => {
    expect(() => loadConfig(env, withFrontendBuilt(false))).toThrow(message);
  });
});
