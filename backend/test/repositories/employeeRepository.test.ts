import { describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/createDb';
import { DuplicateEmailError } from '../../src/errors';
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
  it('records the starting salary in salary_history, effective from the start date', () => {
    const db = createDb(':memory:');
    const repository = createEmployeeRepository(db);

    const employee = repository.insert(
      aNewEmployee({ salaryMinor: 6_500_000, currencyCode: 'EUR', startDate: '2026-11-01' }),
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

  it('raises DuplicateEmailError for an email that is already taken, ignoring case', () => {
    const repository = createEmployeeRepository(createDb(':memory:'));
    repository.insert(aNewEmployee({ email: 'ada@example.com' }));

    expect(() => repository.insert(aNewEmployee({ email: 'ADA@example.com' }))).toThrow(
      DuplicateEmailError,
    );
  });
});

describe('employeeRepository.update', () => {
  it('keeps the previous salary when recording the salary change fails', () => {
    const db = createDb(':memory:');
    const repository = createEmployeeRepository(db);
    const { id } = repository.insert(aNewEmployee({ salaryMinor: 6_500_000 }));
    makeSalaryHistoryInsertsFail(db);

    expect(() =>
      repository.update(id, aNewEmployee({ salaryMinor: 7_000_000 }), {
        salaryChangedOn: '2026-11-07',
      }),
    ).toThrow(/salary history unavailable/);
    expect(repository.findById(id)?.salaryMinor).toBe(6_500_000);
  });
});
