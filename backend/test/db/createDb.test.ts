import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/createDb';
import { migrate } from '../../src/db/migrate';

function tableNames(db: Db): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

function insertEmployee(db: Db, overrides: { email?: string; salaryMinor?: number } = {}): number {
  const result = db
    .prepare(
      `INSERT INTO employees
         (full_name, email, job_title, department, country_code, currency_code, salary_minor)
       VALUES ('Ada Lovelace', ?, 'Engineer', 'Engineering', 'DE', 'EUR', ?)`,
    )
    .run(overrides.email ?? 'ada@example.com', overrides.salaryMinor ?? 5_000_000);
  return Number(result.lastInsertRowid);
}

function insertSalaryHistory(
  db: Db,
  {
    employeeId,
    salaryMinor = 5_000_000,
    effectiveFrom = '2026-01-01',
  }: { employeeId: number; salaryMinor?: number; effectiveFrom?: string },
): void {
  db.prepare(
    `INSERT INTO salary_history (employee_id, salary_minor, currency_code, effective_from)
     VALUES (?, ?, 'EUR', ?)`,
  ).run(employeeId, salaryMinor, effectiveFrom);
}

describe('createDb', () => {
  it('creates the employees and salary_history tables', () => {
    const db = createDb(':memory:');

    expect(tableNames(db)).toEqual(expect.arrayContaining(['employees', 'salary_history']));
  });

  it('rejects salary history for an employee that does not exist', () => {
    const db = createDb(':memory:');

    expect(() => insertSalaryHistory(db, { employeeId: 999 })).toThrow(/FOREIGN KEY/);
  });

  it('deletes salary history together with its employee', () => {
    const db = createDb(':memory:');
    const employeeId = insertEmployee(db);
    insertSalaryHistory(db, { employeeId });

    db.prepare('DELETE FROM employees WHERE id = ?').run(employeeId);

    expect(db.prepare('SELECT COUNT(*) AS count FROM salary_history').get()).toEqual({ count: 0 });
  });

  it('rejects a second employee with the same email, ignoring case', () => {
    const db = createDb(':memory:');
    insertEmployee(db, { email: 'ada@example.com' });

    expect(() => insertEmployee(db, { email: 'ADA@example.com' })).toThrow(/UNIQUE/);
  });

  it.each([0, -1])('rejects an employee salary of %i', (salaryMinor) => {
    const db = createDb(':memory:');

    expect(() => insertEmployee(db, { salaryMinor })).toThrow(/CHECK/);
  });

  it.each([0, -1])('rejects a salary history amount of %i', (salaryMinor) => {
    const db = createDb(':memory:');
    const employeeId = insertEmployee(db);

    expect(() => insertSalaryHistory(db, { employeeId, salaryMinor })).toThrow(/CHECK/);
  });
});

describe('migrate', () => {
  it('can run again on an already migrated database without losing data', () => {
    const db = createDb(':memory:');
    insertEmployee(db);

    migrate(db);

    expect(db.prepare('SELECT COUNT(*) AS count FROM employees').get()).toEqual({ count: 1 });
  });

  it('backfills start_date from the earliest salary history when upgrading from version 1', () => {
    const db = new Database(':memory:');
    migrate(db, { upTo: 1 });
    const employeeId = insertEmployee(db);
    insertSalaryHistory(db, { employeeId, effectiveFrom: '2022-01-01' });
    insertSalaryHistory(db, { employeeId, effectiveFrom: '2020-05-01' });

    migrate(db);

    expect(db.prepare('SELECT start_date FROM employees').get()).toEqual({
      start_date: '2020-05-01',
    });
  });
});
