import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

/** The backend package directory, from both src/ (tsx) and dist/ (compiled): one level up. */
const BACKEND_DIR = resolve(import.meta.dirname, '..');
const DEFAULT_DB_PATH = join(BACKEND_DIR, 'data', 'hr.db');
const DEFAULT_STATIC_DIR = resolve(BACKEND_DIR, '../frontend/dist');

const integer = (
  name: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
) =>
  z.coerce
    .number(`${name} must be a number`)
    .int(`${name} must be a whole number`)
    .min(min, `${name} must be at least ${min}`)
    .max(max, `${name} must be at most ${max}`)
    .default(fallback);

const envSchema = z.object({
  PORT: integer('PORT', { min: 1, max: 65_535, fallback: 3000 }),
  DB_PATH: z.string().min(1).optional(),
  SEED: integer('SEED', { min: 0, max: 2 ** 32 - 1, fallback: 42 }),
  COUNT: integer('COUNT', { min: 1, max: 1_000_000, fallback: 10_000 }),
  STATIC_DIR: z.string().min(1).optional(),
});

export interface Config {
  port: number;
  dbPath: string;
  /** Seed for the deterministic demo data written when the database is empty. */
  seed: number;
  count: number;
  /** Built frontend to serve; undefined when there is none (development, tests). */
  staticDir: string | undefined;
}

/**
 * Reads configuration from environment variables with safe defaults. Paths default relative to
 * the backend package, so the server behaves the same whatever directory it is started from.
 * Invalid values fail fast at startup with a message naming the variable.
 */
export function loadConfig(
  env: Record<string, string | undefined>,
  { exists = existsSync }: { exists?: (path: string) => boolean } = {},
): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid configuration: ${problems}`);
  }
  const { PORT, DB_PATH, SEED, COUNT, STATIC_DIR } = result.data;
  const staticDir = STATIC_DIR ?? DEFAULT_STATIC_DIR;

  return {
    port: PORT,
    dbPath: DB_PATH ?? DEFAULT_DB_PATH,
    seed: SEED,
    count: COUNT,
    staticDir: exists(join(staticDir, 'index.html')) ? staticDir : undefined,
  };
}
