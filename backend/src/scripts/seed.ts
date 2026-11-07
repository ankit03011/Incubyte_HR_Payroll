import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { createDb } from '../db/createDb';
import { generateEmployees } from '../seed/generateEmployees';
import { seedDatabase } from '../seed/seedDatabase';

const dbPath = process.env.DB_PATH ?? 'data/hr.db';
const seed = Number(process.env.SEED ?? 42);
const count = Number(process.env.COUNT ?? 10_000);

// Seeding resets the database so every run yields the same deterministic data set.
rmSync(dbPath, { force: true });
mkdirSync(dirname(dbPath), { recursive: true });

const startedAt = performance.now();
const db = createDb(dbPath);
seedDatabase(db, generateEmployees({ seed, count }));
db.close();

console.log(
  `Seeded ${count} employees (seed ${seed}) into ${dbPath} in ${Math.round(performance.now() - startedAt)} ms`,
);
