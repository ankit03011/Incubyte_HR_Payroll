import type Database from 'better-sqlite3';

/**
 * Ordered schema migrations. Never edit one that has shipped; append a new one.
 * The index + 1 is the schema version stored in PRAGMA user_version.
 */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE employees (
    id            INTEGER PRIMARY KEY,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL COLLATE NOCASE,
    job_title     TEXT    NOT NULL,
    department    TEXT    NOT NULL,
    country_code  TEXT    NOT NULL,
    currency_code TEXT    NOT NULL,
    salary_minor  INTEGER NOT NULL CHECK (salary_minor > 0),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX ux_employees_email              ON employees (email);
  CREATE INDEX        ix_employees_country_salary     ON employees (country_code, salary_minor);
  CREATE INDEX        ix_employees_country_job_salary ON employees (country_code, job_title, salary_minor);
  CREATE INDEX        ix_employees_full_name          ON employees (full_name COLLATE NOCASE);

  CREATE TABLE salary_history (
    id             INTEGER PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    salary_minor   INTEGER NOT NULL CHECK (salary_minor > 0),
    currency_code  TEXT    NOT NULL,
    effective_from TEXT    NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX ix_salary_history_employee_effective
    ON salary_history (employee_id, effective_from DESC);
  `,
  // 2: start date, backfilled from the first salary record. Nullable because SQLite
  // can't add a NOT NULL column without a default; the API always requires it.
  `
  ALTER TABLE employees ADD COLUMN start_date TEXT;

  UPDATE employees
     SET start_date = (SELECT MIN(effective_from) FROM salary_history
                        WHERE salary_history.employee_id = employees.id);

  CREATE INDEX ix_employees_start_date ON employees (start_date);
  `,
];

function currentVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}

/** Applies pending migrations, optionally stopping at `upTo` (used to test upgrades). */
export function migrate(
  db: Database.Database,
  { upTo = MIGRATIONS.length }: { upTo?: number } = {},
): void {
  const applied = currentVersion(db);
  for (const [index, sql] of MIGRATIONS.entries()) {
    const version = index + 1;
    if (version <= applied || version > upTo) continue;
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version}`);
    })();
  }
}
