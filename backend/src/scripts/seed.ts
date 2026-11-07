import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from '../config.js';
import { createDb } from '../db/createDb.js';
import { generateEmployees } from '../seed/generateEmployees.js';
import { seedDatabase } from '../seed/seedDatabase.js';

const { dbPath, seed, count } = loadConfig(process.env);

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
