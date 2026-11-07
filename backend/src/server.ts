import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/createDb.js';
import { seedIfEmpty } from './seed/seedIfEmpty.js';

const config = loadConfig(process.env);

mkdirSync(dirname(config.dbPath), { recursive: true });
const db = createDb(config.dbPath);

// Free hosts give an ephemeral disk: every fresh start has an empty DB, and the deterministic
// seed recreates the same demo data. Existing data is never touched.
if (seedIfEmpty(db, config)) {
  console.log(`Seeded ${config.count} employees (seed ${config.seed}) into ${config.dbPath}`);
}

const server = createApp({ db, staticDir: config.staticDir }).listen(config.port, () => {
  const ui = config.staticDir ? `UI and API` : `API (UI not built; use the Vite dev server)`;
  console.log(`${ui} listening on http://localhost:${config.port}`);
});

// Close the DB cleanly when the host stops the container.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
