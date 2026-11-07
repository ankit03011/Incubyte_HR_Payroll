import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from './app';
import { createDb } from './db/createDb';
import { seedIfEmpty } from './seed/seedIfEmpty';

const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? 'data/hr.db';
const seedOptions = {
  seed: Number(process.env.SEED ?? 42),
  count: Number(process.env.COUNT ?? 10_000),
};

mkdirSync(dirname(dbPath), { recursive: true });
const db = createDb(dbPath);

// Hosts with ephemeral disks start from an empty DB; seeding keeps the demo usable after restarts.
if (seedIfEmpty(db, seedOptions)) {
  console.log(`Seeded ${seedOptions.count} employees (seed ${seedOptions.seed}) into ${dbPath}`);
}

createApp({ db }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
