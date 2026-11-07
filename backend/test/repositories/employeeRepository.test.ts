import { describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/createDb';
import { createEmployeeRepository } from '../../src/repositories/employeeRepository';
import { aNewEmployee } from '../builders/aNewEmployee';

function salaryHistoryOf(db: Db, employeeId: number): unknown[] {
  return db
    .prepare(
      `SELECT salary_minor, currency_code, effective_from
         FROM salary_history WHERE employee_id = ?`,
    )
    .all(employeeId);
}

/** Simulates a failure of the second write using a real DB error instead of a mock. */
function makeSalaryHistoryInsertsFail(db: Db): void {
  db.exec(`
    CREATE TRIGGER fail_salary_history_insert BEFORE INSERT ON salary_history
    BEGIN SELECT RAISE(ABORT, 'salary history unavailable'); END;
  `);
}

describe('employeeRepository.insert', () => {
  it('records the starting salary in salary_history alongside the new employee', () => {
    const db = createDb(':memory:');
    const repository = createEmployeeRepository(db);

    const employee = repository.insert(
      aNewEmployee({ salaryMinor: 6_500_000, currencyCode: 'EUR', effectiveFrom: '2026-11-01' }),
    );

    expect(salaryHistoryOf(db, employee.id)).toEqual([
      { salary_minor: 6_500_000, currency_code: 'EUR', effective_from: '2026-11-01' },
    ]);
  });

  it('leaves no employee behind when recording the salary history fails', () => {
    const db = createDb(':memory:');
    makeSalaryHistoryInsertsFail(db);
    const repository = createEmployeeRepository(db);

    expect(() => repository.insert(aNewEmployee())).toThrow(/salary history unavailable/);
    expect(db.prepare('SELECT COUNT(*) AS count FROM employees').get()).toEqual({ count: 0 });
  });
});
